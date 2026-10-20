// Sovereign Hangar — exhibit state machine: registry, hover, swap, upload, HUD

import * as THREE from "three";
import { clamp, easeInOutCubic, easeOutBack, disposeGroup, normalizeModel } from "./lib.js";

const CLASS_LABEL = { existing: "EXISTING", concept: "CONCEPT", user: "USER-SUPPLIED" };
export { CLASS_LABEL };

export class Showcase {
  constructor({ scene, camera, dom, pedestal, hud }) {
    this.scene = scene;
    this.dom = dom;
    this.pedestal = pedestal;
    this.hud = hud;

    this.models = [];          // [{ id, build: async () => ({group, meta}) }]
    this.current = null;       // active entry
    this.active = null;        // active normalized wrapper
    this.hoverables = [];      // meshes for raycast
    this.outline = null;

    this.hover = false;        // smoothed hover boost 0..1
    this.hoverHit = false;     // raw raycast state
    this.hoverTgt = 0;
    this.levitate = new THREE.Group();
    this.levitate.position.y = 0.86;
    scene.add(this.levitate);

    this.swapT = -1;           // -1 idle, else 0..1 transition progress
    this.pending = null;
    this.busy = false;

    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.lastPointerMove = 0;
  }

  // ---- registry ----------------------------------------------------------
  register(id, label, buildFn) {
    this.models.push({ id, label, build: buildFn });
  }

  indexOf(id) { return this.models.findIndex((m) => m.id === id); }

  async show(id, opts = {}) {
    if (this.busy) return;
    const idx = this.indexOf(id);
    if (idx < 0) return;
    this.busy = true;
    const entry = this.models[idx];

    try {
      const built = await entry.build();
      this.pending = { entry, ...built };
      if (!this.active) {
        // first mount — no transition
        this._mount();
        this.swapT = -1;
        this.busy = false;
        if (opts.onDone) opts.onDone();
        return true;
      }
      this.swapT = 0; // begin out-transition; main loop drives it
      if (opts.onDone) this._onSwapDone = opts.onDone;
      return true;
    } catch (err) {
      this.busy = false;
      console.error("[hangar] exhibit build failed:", err);
      this.hud.toast(`Could not load ${entry.label}: ${err.message}`, false);
      return false;
    }
  }

  next() {
    const idx = this.current ? this.indexOf(this.current.id) : -1;
    const nextEntry = this.models[(idx + 1) % this.models.length];
    this.show(nextEntry.id);
  }

  /** Register + show a validated user-supplied model (parsed locally). */
  showUserModel(group, info) {
    const meta = {
      name: info.name,
      classification: "user",
      source: info.source,
      note: "Validated starfall.mesh.v1 from this device — parsed in-browser, never uploaded to any server."
    };
    const entry = { id: "user", label: info.name, build: async () => ({ group, meta }) };
    const at = this.models.findIndex((m) => m.id === "user");
    if (at >= 0) this.models[at] = entry; else this.models.push(entry);
    return this.show("user");
  }

  _mount() {
    const { entry, group, meta } = this.pending;
    this.pending = null;

    // normalize dimensions so every craft frames identically
    const wrapper = normalizeModel(group, 2.55);
    this.levitate.add(wrapper);

    // collect raycast targets + build technical outline
    this.hoverables = [];
    wrapper.traverse((o) => { if (o.isMesh && o.visible) this.hoverables.push(o); });

    this.current = { id: entry.id, label: entry.label, entry };
    this.active = wrapper;
    this._buildOutline(wrapper);

    this.hud.setMeta({
      name: meta.name,
      cls: meta.classification,
      tris: this._countTriangles(wrapper),
      verts: this._countVertices(wrapper),
      source: meta.source,
      note: meta.note
    });
    if (typeof this.onSelect === "function") {
      this.onSelect(entry.id);
    }
  }

  _countTriangles(root) {
    let n = 0;
    root.traverse((o) => {
      if (o.isMesh && o.geometry) {
        const g = o.geometry;
        n += g.index ? g.index.count / 3 : (g.getAttribute("position")?.count || 0) / 3;
      }
    });
    return Math.round(n);
  }

  _countVertices(root) {
    let n = 0;
    root.traverse((o) => {
      if (o.isMesh && o.geometry) n += o.geometry.getAttribute("position")?.count || 0;
    });
    return n;
  }

  _buildOutline(wrapper) {
    if (this.outline) {
      this.levitate.remove(this.outline);
      disposeGroup(this.outline);
      this.outline = null;
    }
    const outline = new THREE.Group();
    wrapper.updateWorldMatrix(true, true);
    wrapper.traverse((o) => {
      if (o.isMesh && o.geometry) {
        const seg = new THREE.LineSegments(
          new THREE.EdgesGeometry(o.geometry, 18),
          new THREE.LineBasicMaterial({
            color: 0x9ffcff, transparent: true, opacity: 0
          })
        );
        seg.applyMatrix4(o.matrixWorld);
        outline.add(seg);
      }
    });
    outline.visible = false;
    this.outline = outline;
    this.levitate.add(outline);
  }

  // ---- per-frame ---------------------------------------------------------
  update(t, dt, motionOn) {
    // hover boost smoothing
    this.hoverTgt = this.hoverHit ? 1 : 0;
    this.hover += (this.hoverTgt - this.hover) * clamp(dt * 8, 0, 1);
    const hb = this.hover > 0.35;

    // levitation (independent of camera orbit; reduced-motion flattens it)
    if (motionOn) {
      this.levitate.position.y = 0.86 + Math.sin(t * 0.85) * 0.05;
      this.levitate.rotation.y = t * 0.16; // ship self-spin, distinct rate from camera
    } else {
      this.levitate.rotation.y += 0;
    }

    // per-craft pulse hooks (thrusters, glow shells)
    if (this.active) {
      const pulse = this.active.children[0]?.userData?.pulse;
      if (pulse) pulse(t);
    }

    // technical outline fade (hidden during swap transitions)
    if (this.outline) {
      this.outline.visible = this.hover > 0.05 && this.swapT < 0;
      this.outline.traverse((o) => {
        if (o.material) o.material.opacity = 0.5 * this.hover;
      });
    }

    // swap transition timeline
    if (this.swapT >= 0) {
      this.swapT += dt / 0.72;
      const k = clamp(this.swapT, 0, 1);
      if (k < 0.5) {
        // out
        const e = easeInOutCubic(k / 0.5);
        this.active.scale.setScalar(Math.max(0.001, 1 - e));
        this.active.position.y = e * 0.35;
      } else if (this.pending) {
        // swap payload at midpoint
        disposeGroup(this.active);
        this.levitate.remove(this.active);
        this._mount();
        const e = easeOutBack((k - 0.5) / 0.5);
        this.active.scale.setScalar(Math.max(0.001, e));
      } else if (this.active) {
        const e = easeOutBack((k - 0.5) / 0.5);
        this.active.scale.setScalar(Math.max(0.001, e));
      }
      if (k >= 1) {
        this.swapT = -1;
        this.busy = false;
        if (this.active) this.active.scale.setScalar(1);
        const cb = this._onSwapDone;
        this._onSwapDone = null;
        if (cb) cb();
      }
    }

    this.pedestal.update(t, dt, { motionOn, hoverBoost: hb });
  }

  // ---- pointer interaction -------------------------------------------------
  pointerMove(clientX, clientY, camera) {
    const now = performance.now();
    if (now - this.lastPointerMove < 40) return; // ~25 raycasts/s is plenty
    this.lastPointerMove = now;
    const rect = this.dom.getBoundingClientRect();
    this.pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointerNdc, camera);
    const hit = this.raycaster.intersectObjects(this.hoverables, false).length > 0;
    this.hoverHit = hit;
    this.hover = hit ? Math.max(this.hover, 0.4) : this.hover; // decay handled in update
    this.dom.classList.toggle("hover-ship", hit);
    this.hud.setHover(hit);
  }

  clickThrough(clientX, clientY, camera) {
    // A tap on the craft swaps; a tap on empty space does nothing.
    const rect = this.dom.getBoundingClientRect();
    this.pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointerNdc, camera);
    return this.raycaster.intersectObjects(this.hoverables, false).length > 0;
  }

  clearHover() {
    this.hoverHit = false;
    this.hover = 0;
    this.hoverTgt = 0;
    this.dom.classList.remove("hover-ship");
    this.hud.setHover(false);
  }
}

// Sovereign Hangar — camera rig
// Custom orbit controller: damped, frame-time-independent, idle auto-orbit,
// drag + wheel + pinch, safe zoom clamps, reduced-motion aware.

import { clamp, damp } from "./lib.js";

const TAU = Math.PI * 2;

export class OrbitRig {
  constructor(camera, dom, opts = {}) {
    this.camera = camera;
    this.dom = dom;

    // current spherical state
    this.sph = { az: 0.55, pol: 1.18, r: 5.4 };
    // target spherical state (damped toward)
    this.tgt = { az: 0.55, pol: 1.18, r: 5.4 };
    // where "reset" returns to
    this.home = { az: 0.55, pol: 1.18, r: 5.4 };

    this.target = opts.target || new THREE.Vector3(0, 1.05, 0);
    this.minR = 2.6;
    this.maxR = 9.5;
    this.minPol = 0.5;
    this.maxPol = 1.85;
    this.inspectR = 3.1;

    this.autoSpeed = 0.09;           // rad/s, camera idle orbit
    this.idleDelay = 3.2;            // s of inactivity before auto-orbit resumes
    this.idleTimer = 0;              // counts up while no interaction
    this.autoOrbit = !opts.reducedMotion; // user/reduced-motion master switch
    this.reducedMotion = !!opts.reducedMotion;
    this.mode = "auto";              // "auto" | "manual" | "inspect"

    this.inspectSnapshot = null;

    // pointer state
    this.pointers = new Map();
    this.lastPinch = 0;
    this.moved = 0;
    this.downAt = 0;

    this.onInteract = opts.onInteract || (() => {});
    this.onTap = opts.onTap || (() => {});
    this._bind();
    this.apply(0.016);
  }

  setProfile(profile) {
    if (!profile) return;
    this.home.r = profile.orbitDistance;
    this.minR = profile.minR || 2.6;
    this.maxR = profile.maxR || 12.0;
    this.minPol = profile.minPol || 0.5;
    this.maxPol = profile.maxPol || 1.85;
    this.inspectR = profile.inspectR || Math.max(this.minR + 0.4, 3.1);
    if (typeof profile.targetY === "number") {
      this.target.y = profile.targetY;
    }
    if (this.mode === "auto") {
      this.tgt.r = profile.orbitDistance;
    } else if (this.mode === "inspect") {
      this.tgt.r = this.inspectR;
    }
    // Dynamic boundary safety: enforce new spherical constraints on resize/orientation
    this.tgt.r = clamp(this.tgt.r, this.minR, this.maxR);
    this.sph.r = clamp(this.sph.r, this.minR, this.maxR);
    this.tgt.pol = clamp(this.tgt.pol, this.minPol, this.maxPol);
    this.sph.pol = clamp(this.sph.pol, this.minPol, this.maxPol);
  }

  _bind() {
    const dom = this.dom;
    dom.addEventListener("pointerdown", (e) => this._down(e));
    dom.addEventListener("pointermove", (e) => this._move(e));
    dom.addEventListener("pointerup", (e) => this._up(e));
    dom.addEventListener("pointercancel", (e) => this._up(e));
    dom.addEventListener("wheel", (e) => this._wheel(e), { passive: false });
    dom.addEventListener("touchstart", (e) => {
      if (e.target === dom || dom.contains(e.target)) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  _down(e) {
    if (e.pointerType !== "touch" || this.pointers.size === 0) {
      try { this.dom.setPointerCapture?.(e.pointerId); } catch { /* synthetic or released pointer */ }
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.moved = 0;
    this.downAt = performance.now();
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    this._poke();
  }

  _move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;

    if (this.pointers.size === 1) {
      this.moved += Math.abs(dx) + Math.abs(dy);
      const sensitivity = (e.pointerType === "touch") ? 0.0058 : 0.0052;
      this.tgt.az -= dx * sensitivity;
      this.tgt.pol = clamp(this.tgt.pol - dy * (sensitivity * 0.73), this.minPol, this.maxPol);
      this._poke("manual");
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.lastPinch > 0 && d > 12) {
        this.tgt.r = clamp(this.tgt.r * (this.lastPinch / d), this.minR, this.maxR);
      }
      this.lastPinch = d;
      this.moved += 4;
      this._poke("manual");
    }
  }

  _up(e) {
    const wasSingle = this.pointers.size === 1;
    try { this.dom.releasePointerCapture?.(e.pointerId); } catch {}
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.lastPinch = 0;
    const tapThreshold = (e.pointerType === "touch") ? 18 : 9;
    const tapTimeLimit = (e.pointerType === "touch") ? 500 : 420;
    if (wasSingle && this.moved < tapThreshold && performance.now() - this.downAt < tapTimeLimit) {
      this.onTap(e);
    }
  }

  _wheel(e) {
    e.preventDefault();
    const zoom = Math.exp(Math.sign(e.deltaY) * Math.min(0.28, Math.abs(e.deltaY) * 0.0016));
    this.tgt.r = clamp(this.tgt.r * zoom, this.minR, this.maxR);
    this._poke();
  }

  /** Register interaction; optionally switch mode. */
  _poke(mode) {
    this.idleTimer = 0;
    if (mode) this.mode = mode;
    this.onInteract(this.mode);
  }

  keyOrbit(dAz, dPol) {
    this.tgt.az -= dAz;
    this.tgt.pol = clamp(this.tgt.pol - dPol, this.minPol, this.maxPol);
    this._poke("manual");
  }

  zoomBy(f) {
    this.tgt.r = clamp(this.tgt.r * f, this.minR, this.maxR);
    this._poke();
  }

  resetView() {
    this.tgt = { ...this.home };
    this.inspectSnapshot = null;
    this.mode = "auto";
    this._poke();
  }

  toggleInspect() {
    if (this.mode === "inspect") {
      if (this.inspectSnapshot) {
        this.tgt = {
          az: this.inspectSnapshot.az,
          pol: clamp(this.inspectSnapshot.pol, this.minPol, this.maxPol),
          r: clamp(this.inspectSnapshot.r, this.minR, this.maxR)
        };
      }
      this.inspectSnapshot = null;
      this.mode = "auto";
      return false;
    }
    this.inspectSnapshot = { ...this.tgt };
    const targetR = this.inspectR || Math.max(this.minR + 0.4, 3.1);
    this.tgt = {
      az: this.sph.az + 0.5,
      pol: clamp(1.32, this.minPol, this.maxPol),
      r: clamp(targetR, this.minR, this.maxR)
    };
    this.mode = "inspect";
    return true;
  }

  setMotion(on) {
    this.autoOrbit = on;
    if (!on && this.mode === "auto") this.mode = "manual";
  }

  update(dt) {
    this.idleTimer += dt;
    if (this.autoOrbit && !this.reducedMotion &&
        this.idleTimer > this.idleDelay &&
        (this.mode === "auto" || this.mode === "manual")) {
      this.mode = "auto";
      // Ship spins on its own axis at a different rate, so the exhibit stays
      // visually alive even during camera auto-orbit.
      this.tgt.az += this.autoSpeed * dt;
    }
    this.apply(dt);
  }

  apply(dt) {
    if (dt > 0) {
      const k = damp(6, dt);
      this.sph.az += (this.tgt.az - this.sph.az) * k;
      this.sph.pol += (this.tgt.pol - this.sph.pol) * k;
      this.sph.r += (this.tgt.r - this.sph.r) * k;
    } else {
      this.sph = { ...this.tgt };
    }
    const { az, pol, r } = this.sph;
    this.camera.position.set(
      this.target.x + r * Math.sin(pol) * Math.sin(az),
      this.target.y + r * Math.cos(pol),
      this.target.z + r * Math.sin(pol) * Math.cos(az)
    );
    this.camera.lookAt(this.target);
  }

  modeLabel() {
    if (this.mode === "inspect") return "INSPECT";
    return this.mode === "auto" ? "AUTO ORBIT" : "MANUAL";
  }
}

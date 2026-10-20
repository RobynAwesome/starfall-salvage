// Sovereign Hangar — shared helpers (isolated viewer module; no game code imports)

import * as THREE from "three";

export const DEG = Math.PI / 180;

/** Frame-rate independent exponential smoothing factor. */
export function damp(factor, dt) {
  return 1 - Math.exp(-factor * dt);
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Easing used by swap / reset transitions. */
export function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
export function easeOutBack(t) {
  const c1 = 1.20158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Faceted indexed geometry from an explicit vertex pool + triangle list.
 * Mirrors the repo's createFaceMesh()/normalFor() winding convention:
 * triangles are CCW seen from outside; materials use flatShading.
 */
export function facetedGeometry(positions, tris) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(tris);
  geo.computeVertexNormals();
  return geo;
}

/** Mirror an array of [x,y,z] vertices across x (negate x, flip winding). */
export function mirrorTris(tris) {
  const out = [];
  for (let i = 0; i < tris.length; i += 3) out.push(tris[i], tris[i + 2], tris[i + 1]);
  return out;
}

/** Procedural wear roughness map: base micro-noise + polished scratch streaks. */
export function makeWearRoughnessTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#cfcfcf";
  ctx.fillRect(0, 0, size, size);
  // fine grain
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 200 + Math.random() * 55;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
  }
  ctx.putImageData(img, 0, 0);
  // brushed streaks
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = Math.random() > 0.5 ? "#8f8f8f" : "#f4f4f4";
    ctx.lineWidth = 0.6 + Math.random() * 1.2;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 8,
                      size * 0.7, y + (Math.random() - 0.5) * 8, size, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/** Soft radial glow sprite texture (used for thrusters and light spill). */
export function makeGlowTexture(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, "rgba(160,240,255,0.55)");
  g.addColorStop(0.65, "rgba(60,180,220,0.14)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

/** Subtle concrete texture for the hangar floor. */
export function makeConcreteTexture(size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#15181c";
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n + 2;
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 26; i++) {
    ctx.strokeStyle = Math.random() > 0.5 ? "#20242a" : "#0d0f12";
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const x = Math.random() * size, y = Math.random() * size;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * size * 0.5, y + (Math.random() - 0.5) * size * 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  return tex;
}

/**
 * Recursively dispose GPU resources of a subtree.
 * Called on every model swap so old craft never leak buffers/textures.
 */
export function disposeGroup(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const m of mats) {
      for (const key of ["map", "roughnessMap", "metalnessMap", "normalMap", "emissiveMap", "alphaMap"]) {
        if (m[key] && m[key].dispose) m[key].dispose();
      }
      m.dispose();
    }
  });
}

/** Fit + center a model group inside a target sphere, oriented nose to -Z. */
export function normalizeModel(group, targetMaxDim = 2.6) {
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const s = targetMaxDim / maxDim;
  group.position.sub(center);
  group.position.y += size.y / 2; // rest on y=0 before hover offset
  const wrapper = new THREE.Group();
  wrapper.add(group);
  wrapper.scale.setScalar(s);
  return wrapper;
}

// Sovereign Hangar — STARFALL SALVAGER MK-I (proposed concept craft)
// Visual evolution derived from the in-game player ship: nose forward -Z
// (game convention), faceted hex-diamond fuselage, swept wings, armored
// cockpit, twin ion nacelles, mint energy conduits, graphite + titanium
// materials with procedural wear. This is a concept design, NOT a canonical
// game asset. All geometry is generated here; no external model files.

import * as THREE from "three";
import { facetedGeometry, makeWearRoughnessTexture, makeGlowTexture, DEG } from "../lib.js";

// ---- fuselage ring stations: [z, halfWidth, halfHeight, yOffset] ----------
const RINGS = [
  [-1.55, 0.10, 0.085, 0.0],
  [-0.95, 0.225, 0.165, 0.02],
  [-0.25, 0.305, 0.22, 0.035],
  [0.45, 0.28, 0.2, 0.02],
  [1.05, 0.2, 0.145, 0.0],
  [1.38, 0.14, 0.1, 0.0]
];
const NOSE_TIP = [0, 0.01, -2.05];

// hex-diamond profile: vertices at 0,60,...300deg -> flat top + flat belly
const PROF_ANGLES = [0, 60, 120, 180, 240, 300];

function ringPoint([z, w, h, yOff], deg) {
  const a = deg * DEG;
  return [Math.cos(a) * w, Math.sin(a) * h + yOff, z];
}

function buildFuselage() {
  const pos = [];
  const tris = [];
  const tipIdx = pos.length / 3; pos.push(...NOSE_TIP);
  const ringStart = [];
  RINGS.forEach((ring) => {
    ringStart.push(pos.length / 3);
    PROF_ANGLES.forEach((a) => pos.push(...ringPoint(ring, a)));
  });

  // nose fan (faces -Z)
  const r0 = ringStart[0];
  for (let i = 0; i < 6; i++) {
    tris.push(tipIdx, r0 + ((i + 1) % 6), r0 + i);
  }
  // hull quads between consecutive rings
  for (let s = 0; s < RINGS.length - 1; s++) {
    const A = ringStart[s], B = ringStart[s + 1];
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      tris.push(A + i, A + j, B + j);
      tris.push(A + i, B + j, B + i);
    }
  }
  return facetedGeometry(pos, tris);
}

// ---- canopy: faceted arch over the top deck -------------------------------
const CANOPY_STATIONS = [
  [-1.05, 0.03, 0.03, 0.16],
  [-0.7, 0.13, 0.115, 0.2],
  [-0.3, 0.16, 0.135, 0.225],
  [0.12, 0.045, 0.04, 0.2]
];
const ARCH_ANGLES = [0, 45, 90, 135, 180];

function buildCanopy() {
  const pos = [];
  const tris = [];
  const stStart = [];
  CANOPY_STATIONS.forEach(([z, w, h, y]) => {
    stStart.push(pos.length / 3);
    ARCH_ANGLES.forEach((a) => {
      const r = a * DEG;
      pos.push(Math.cos(r) * w, Math.sin(r) * h + y, z);
    });
  });
  const n = ARCH_ANGLES.length;
  for (let s = 0; s < CANOPY_STATIONS.length - 1; s++) {
    const A = stStart[s], B = stStart[s + 1];
    for (let k = 0; k < n - 1; k++) {
      tris.push(A + k, A + k + 1, B + k + 1);
      tris.push(A + k, B + k + 1, B + k);
    }
  }
  // end caps
  const c0 = pos.length / 3;
  pos.push(0, CANOPY_STATIONS[0][3] + 0.005, CANOPY_STATIONS[0][0]);
  const c3 = pos.length / 3;
  const L = CANOPY_STATIONS.length - 1;
  pos.push(0, CANOPY_STATIONS[L][3] + 0.005, CANOPY_STATIONS[L][0]);
  for (let k = 0; k < n - 1; k++) {
    tris.push(c0, stStart[0] + k + 1, stStart[0] + k);        // front (-Z)
    tris.push(c3, stStart[L] + k, stStart[L] + k + 1);        // rear (+Z)
  }
  return facetedGeometry(pos, tris);
}

// ---- wings: swept, cranked trailing edge, dihedral, tapered thickness -----
function buildWing() { // right wing; left is mirrored
  const outline = [ // [x, z]
    [0.24, -0.42],  // root leading edge
    [1.68, 0.38],   // tip leading edge
    [1.62, 0.98],   // tip trailing edge
    [0.62, 1.08],   // trailing edge kink
    [0.26, 1.18]    // root trailing edge
  ];
  const dihedral = (x) => 0.04 + (x - 0.24) * 0.075;
  const thick = (x) => Math.max(0.03, 0.075 - (x - 0.24) * 0.03);

  const pos = [], tris = [];
  const top = [], bot = [];
  outline.forEach(([x, z]) => {
    const y = dihedral(x), t = thick(x) / 2;
    top.push(pos.length / 3); pos.push(x, y + t, z);
    bot.push(pos.length / 3); pos.push(x, y - t, z);
  });
  const n = outline.length;
  for (let i = 1; i < n - 1; i++) {
    tris.push(top[0], top[i + 1], top[i]);      // top skin (+Y)
    tris.push(bot[0], bot[i], bot[i + 1]);      // bottom skin (-Y)
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tris.push(top[i], bot[j], bot[i]);          // edge band
    tris.push(top[i], top[j], bot[j]);
  }
  return { geo: facetedGeometry(pos, tris), outline, dihedral };
}

function buildFin() { // vertical tail fin, outline in (z, y)
  const outline = [[-0.05, 0.16], [0.55, 0.16], [0.98, 0.6], [0.84, 0.6]];
  const t = 0.014;
  const pos = [], tris = [];
  const A = [], B = [];
  outline.forEach(([z, y]) => {
    A.push(pos.length / 3); pos.push(-t, y, z);
    B.push(pos.length / 3); pos.push(t, y, z);
  });
  const n = outline.length;
  for (let i = 1; i < n - 1; i++) {
    tris.push(A[0], A[i], A[i + 1]);
    tris.push(B[0], B[i + 1], B[i]);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tris.push(A[i], B[j], A[j]);
    tris.push(A[i], B[i], B[j]);
  }
  return facetedGeometry(pos, tris);
}

export function buildMk1() {
  const group = new THREE.Group();
  group.name = "starfall-salvager-mk1";

  const wear = makeWearRoughnessTexture();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x2b2f36, roughness: 0.58, metalness: 0.42,
    roughnessMap: wear, flatShading: true, envMapIntensity: 0.55
  });
  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x9aa2ac, roughness: 0.34, metalness: 0.92, envMapIntensity: 1.0
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x08090c, roughness: 0.72, metalness: 0.3, envMapIntensity: 0.25
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x06222b, roughness: 0.07, metalness: 0.2,
    emissive: 0x18c8e8, emissiveIntensity: 0.4,
    flatShading: true, transparent: true, opacity: 0.94, envMapIntensity: 1.4
  });
  const conduitMat = new THREE.MeshBasicMaterial({ color: 0x57ffc9 });
  const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x46e6ff });

  // hull
  const fuselage = new THREE.Mesh(buildFuselage(), hullMat);
  fuselage.castShadow = true;
  group.add(fuselage);

  // rear engine plate (dark inset)
  const plate = new THREE.Mesh(new THREE.CircleGeometry(0.14, 6), darkMat);
  plate.scale.y = 0.72; // matches the elliptical hull cross-section
  plate.position.set(0, 0, 1.379);
  group.add(plate);

  // canopy
  const canopy = new THREE.Mesh(buildCanopy(), canopyMat);
  canopy.castShadow = true;
  group.add(canopy);

  // wings + titanium leading edges + nav lights
  const wing = buildWing();
  const navGeo = new THREE.SphereGeometry(0.024, 10, 8);
  const navMat = new THREE.MeshBasicMaterial({ color: 0x57ffc9 });
  [-1, 1].forEach((side) => {
    const m = new THREE.Mesh(wing.geo, hullMat);
    m.scale.x = side;
    m.castShadow = true;
    group.add(m);

    // leading edge strips
    [[0, 1], [1, 2]].forEach(([a, b]) => {
      const [x1, z1] = wing.outline[a], [x2, z2] = wing.outline[b];
      const p1 = new THREE.Vector3(x1 * side, wing.dihedral(x1), z1);
      const p2 = new THREE.Vector3(x2 * side, wing.dihedral(x2), z2);
      const len = p1.distanceTo(p2);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.02, len * 0.96), titaniumMat);
      strip.position.copy(p1).add(p2).multiplyScalar(0.5);
      strip.lookAt(p2);
      strip.castShadow = true;
      group.add(strip);
    });

    // wingtip nav light
    const [tx, tz] = wing.outline[1];
    const nav = new THREE.Mesh(navGeo, navMat);
    nav.position.set(tx * side, wing.dihedral(tx) + 0.012, (tz + wing.outline[2][1]) / 2);
    group.add(nav);
  });

  // tail fin + pitot
  const fin = new THREE.Mesh(buildFin(), hullMat);
  fin.castShadow = true;
  group.add(fin);
  const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), titaniumMat);
  pitot.position.set(0, 0.63, 0.98);
  pitot.rotation.x = Math.PI / 2 - 0.12;
  group.add(pitot);

  // twin ion nacelles
  const nacGeo = new THREE.CylinderGeometry(0.105, 0.118, 0.44, 6);
  nacGeo.rotateX(Math.PI / 2);
  const nozGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.07, 6);
  nozGeo.rotateX(Math.PI / 2);
  const exGeo = new THREE.CircleGeometry(0.066, 6);
  const glowTex = makeGlowTexture();
  const exhaustLights = [];
  const exhaustSprites = [];
  [-1, 1].forEach((side) => {
    const nac = new THREE.Mesh(nacGeo, titaniumMat);
    nac.position.set(0.3 * side, -0.01, 1.3);
    nac.castShadow = true;
    group.add(nac);

    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.24), hullMat);
    pylon.position.set(0.22 * side, -0.005, 1.22);
    pylon.castShadow = true;
    group.add(pylon);

    const noz = new THREE.Mesh(nozGeo, darkMat);
    noz.position.set(0.3 * side, -0.01, 1.5);
    group.add(noz);

    const ex = new THREE.Mesh(exGeo, thrusterMat);
    ex.rotation.y = Math.PI / 6;
    ex.position.set(0.3 * side, -0.01, 1.537);
    group.add(ex);

    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0x46e6ff, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    spr.scale.setScalar(0.5);
    spr.position.set(0.3 * side, -0.01, 1.66);
    group.add(spr);
    exhaustSprites.push(spr);

    const pl = new THREE.PointLight(0x46e6ff, 0.55, 2.4, 1.8);
    pl.position.set(0.3 * side, -0.01, 1.72);
    group.add(pl);
    exhaustLights.push(pl);
  });

  // mint energy conduits + panel seams
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.014, 1.5), conduitMat);
  belly.position.set(0, -0.163, -0.25);
  group.add(belly);

  function seamRing(z, w, h, yOff, mat) {
    const geo = new THREE.CylinderGeometry(w, w, 0.012, 6);
    geo.rotateX(Math.PI / 2);
    geo.rotateZ(-Math.PI / 6); // align hex corners with the hull profile
    const m = new THREE.Mesh(geo, mat);
    m.scale.y = h / w;
    m.position.set(0, yOff, z);
    return m;
  }
  group.add(seamRing(-0.62, 0.268, 0.192, 0.022, conduitMat));
  group.add(seamRing(0.72, 0.244, 0.172, 0.012, titaniumMat));

  // intake vents
  [-1, 1].forEach((side) => {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.3), darkMat);
    vent.position.set(0.262 * side, 0.035, 0.08);
    vent.rotation.y = side * -0.06;
    group.add(vent);
  });

  // ventral strake
  const strake = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.5), titaniumMat);
  strake.position.set(0, -0.185, 0.72);
  group.add(strake);

  // restrained idle animation hooks
  group.userData.pulse = (t) => {
    const k = 0.82 + Math.sin(t * 3.1) * 0.18;
    thrusterMat.color.setRGB(0.27 * k, 0.9 * k, 1 * k);
    exhaustSprites.forEach((s) => { s.material.opacity = 0.45 + 0.2 * Math.sin(t * 6.3); });
    exhaustLights.forEach((l) => { l.intensity = 0.45 + 0.18 * Math.sin(t * 6.3); });
    conduitMat.color.setRGB(0.34, 1, 0.79).multiplyScalar(0.85 + Math.sin(t * 2.2) * 0.15);
  };

  return {
    group,
    meta: {
      name: "STARFALL SALVAGER MK-I",
      classification: "concept",
      source: "Proposed visual evolution · derived from createShipMesh()",
      note: "Concept craft: faceted hex-diamond fuselage, swept wings, armored canopy, twin ion nacelles and mint conduits. A proposed evolution of the in-game ship — not an established game asset.",
      textures: [wear, glowTex]
    }
  };
}

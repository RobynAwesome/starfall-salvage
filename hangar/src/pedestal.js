// Sovereign Hangar — display pedestal, glass projection frame, particles

import * as THREE from "three";
import { makeGlowTexture } from "./lib.js";

const HEX_SEGS = 6;

function hexRing(radius, thickness, depth, mat) {
  // Capped short hex cylinder: caps make the lip readable from above,
  // the wall reads from the side. (Open tubes vanish at steep angles.)
  const geo = new THREE.CylinderGeometry(radius, radius, depth, HEX_SEGS, 1, false);
  return new THREE.Mesh(geo, mat);
}

export function buildPedestal(scene) {
  const pedestal = new THREE.Group();
  pedestal.name = "pedestal";

  const black = new THREE.MeshStandardMaterial({
    color: 0x1d232c, roughness: 0.5, metalness: 0.62, envMapIntensity: 1.1
  });
  const facetMat = new THREE.MeshStandardMaterial({
    color: 0x465062, roughness: 0.26, metalness: 0.95, envMapIntensity: 1.45
  });
  // Neon: toneMapped=false keeps the hue saturated under ACES.
  const neonMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.16, 0.85, 1.0), fog: false, toneMapped: false
  });
  const mintMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.3, 1.0, 0.68), fog: false, toneMapped: false
  });

  // --- Matte-black hexagonal base with beveled metallic facets -----------
  // Profile: base slab -> bevel -> plate; neon lip sits proud of the plate
  // edge so it is never occluded by the pedestal's own mass.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.16, HEX_SEGS), black);
  base.position.y = 0.08;
  base.castShadow = true;
  base.receiveShadow = true;
  base.name = "pedestal-base";
  pedestal.add(base);

  const chamfer = new THREE.Mesh(new THREE.CylinderGeometry(1.86, 2.0, 0.1, HEX_SEGS), facetMat);
  chamfer.position.y = 0.21;
  chamfer.castShadow = true;
  pedestal.add(chamfer);

  const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.86, 0.14, HEX_SEGS), black);
  topPlate.position.y = 0.33;
  topPlate.receiveShadow = true;
  pedestal.add(topPlate);

  // --- Cyan neon perimeter: glowing lip wrapping the plate edge ----------
  const perimeter = hexRing(1.92, 0.05, 0.075, neonMat.clone());
  perimeter.position.y = 0.31;
  perimeter.name = "neon-perimeter";
  pedestal.add(perimeter);

  // additive halo band so the neon visibly bleeds light
  const halo = hexRing(1.935, 0.1, 0.12, new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.1, 0.45, 0.55), transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    fog: false, toneMapped: false
  }));
  halo.position.y = 0.31;
  pedestal.add(halo);

  // interior light makes the chamfer facets glow from within and spills
  // onto the surrounding floor
  const seamLight = new THREE.PointLight(0x36e2ff, 2.6, 4.4, 1.4);
  seamLight.position.set(0, 0.28, 0);
  pedestal.add(seamLight);

  // Recessed central projection ring + inner ring: flat hex annuli on the plate
  function hexAnnulus(inner, outer, y, mat) {
    const geo = new THREE.RingGeometry(inner, outer, 6);
    geo.rotateX(-Math.PI / 2); // face up
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    return m;
  }
  const projRing = hexAnnulus(0.84, 0.94, 0.403, neonMat.clone());
  projRing.name = "projection-ring";
  pedestal.add(projRing);

  const innerRing = hexAnnulus(0.68, 0.72, 0.404, mintMat.clone());
  innerRing.name = "inner-ring";
  pedestal.add(innerRing);

  // Small animated energy indicators riding the neon lip
  const indicators = [];
  const indGeo = new THREE.SphereGeometry(0.055, 10, 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const dot = new THREE.Mesh(indGeo, mintMat.clone());
    dot.position.set(Math.cos(a) * 1.95, 0.31, Math.sin(a) * 1.95);
    dot.name = "energy-indicator";
    pedestal.add(dot);
    indicators.push(dot);
  }

  scene.add(pedestal);

  // --- Levitating glass projection frame ---------------------------------
  const frame = new THREE.Group();
  frame.name = "glass-frame";

  const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.16, 0.8, 1.0), transparent: true, opacity: 0.9, fog: false, toneMapped: false });
  const edgeMat2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.0, 0.68), transparent: true, opacity: 0.4, fog: false, toneMapped: false });
  const glassMat = new THREE.MeshBasicMaterial({
    color: 0x9adfff, transparent: true, opacity: 0.045,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });

  const R = 1.42, y0 = 0.42, y1 = 2.1;

  function hexOutline(radius, y, mat, tubeR) {
    const pts = [];
    for (let i = 0; i <= HEX_SEGS; i++) {
      const a = (i / HEX_SEGS) * Math.PI * 2 + Math.PI / 6;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0), 48, tubeR, 6, false);
    const m = new THREE.Mesh(geo, mat);
    return m;
  }

  const ringTop = hexOutline(R, y1, edgeMat, 0.012);
  const ringBottom = hexOutline(R, y0, edgeMat, 0.014);
  const ringMid = hexOutline(R * 0.985, (y0 + y1) / 2, edgeMat2, 0.007);
  frame.add(ringTop, ringBottom, ringMid);

  // Corner pillars
  const pillarGeo = new THREE.CylinderGeometry(0.008, 0.008, y1 - y0, 6);
  for (let i = 0; i < HEX_SEGS; i++) {
    const a = (i / HEX_SEGS) * Math.PI * 2 + Math.PI / 6;
    const p = new THREE.Mesh(pillarGeo, edgeMat);
    p.position.set(Math.cos(a) * R, (y0 + y1) / 2, Math.sin(a) * R);
    frame.add(p);
  }

  // Glass hex wall panels (layered holographic depth: two nested shells)
  const panelGeo = new THREE.CylinderGeometry(R, R, y1 - y0, HEX_SEGS, 1, true);
  panelGeo.rotateY(Math.PI / 6);
  const glassShell = new THREE.Mesh(panelGeo, glassMat);
  glassShell.position.y = (y0 + y1) / 2;
  frame.add(glassShell);

  const innerShell = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.8, R * 0.8, (y1 - y0) * 0.72, HEX_SEGS, 1, true),
    glassMat.clone()
  );
  innerShell.material.opacity = 0.03;
  innerShell.position.y = (y0 + y1) / 2;
  frame.add(innerShell);

  scene.add(frame);

  // --- Atmospheric particles ---------------------------------------------
  const P_COUNT = 240;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(P_COUNT * 3);
  const pSeed = new Float32Array(P_COUNT);
  for (let i = 0; i < P_COUNT; i++) {
    const r = 0.35 + Math.random() * 2.6;
    const a = Math.random() * Math.PI * 2;
    pPos[i * 3] = Math.cos(a) * r;
    pPos[i * 3 + 1] = 0.15 + Math.random() * 3.4;
    pPos[i * 3 + 2] = Math.sin(a) * r;
    pSeed[i] = Math.random() * Math.PI * 2;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const glowTex = makeGlowTexture();
  const pMat = new THREE.PointsMaterial({
    size: 0.028, map: glowTex, transparent: true, opacity: 0.5,
    color: 0x7fe8ff, blending: THREE.AdditiveBlending, depthWrite: false,
    sizeAttenuation: true
  });
  const particles = new THREE.Points(pGeo, pMat);
  particles.name = "particles";
  scene.add(particles);

  /** Per-frame pedestal/frame/particle animation. */
  function update(t, dt, opts) {
    const { motionOn, hoverBoost } = opts;

    // Levitation: frame bobs gently, opposite phase to the exhibit.
    frame.position.y = motionOn ? Math.sin(t * 0.6) * 0.035 : 0;
    frame.rotation.y = motionOn ? t * 0.05 : 0;

    // Neon brightness: hover raises intensity.
    const boost = hoverBoost ? 1.45 : 1.0;
    perimeter.material.color.setRGB(0.16 * boost, 0.85 * boost, 1.0 * boost);
    projRing.material.color.setRGB(0.16 * boost, 0.85 * boost, 1.0 * boost);
    halo.material.opacity = 0.4 * boost;
    edgeMat.opacity = 0.9 * boost;
    glassMat.opacity = 0.045 * (hoverBoost ? 1.8 : 1);

    // Energy indicators chase each other around the chamfer.
    indicators.forEach((dot, i) => {
      const phase = (t * 1.4 + i / indicators.length) % 1;
      const pulse = motionOn
        ? 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(phase * Math.PI * 2)), 3)
        : 0.62;
      dot.material.color.setRGB(0.3 * (0.35 + pulse), 1.0 * (0.35 + pulse), 0.68 * (0.35 + pulse));
    });

    // Particle drift (wrap around the volume).
    if (motionOn) {
      const arr = pGeo.attributes.position.array;
      for (let i = 0; i < P_COUNT; i++) {
        arr[i * 3 + 1] += dt * (0.055 + 0.03 * Math.sin(pSeed[i]));
        arr[i * 3] += dt * 0.012 * Math.sin(t * 0.2 + pSeed[i]);
        if (arr[i * 3 + 1] > 3.6) arr[i * 3 + 1] = 0.12;
      }
      pGeo.attributes.position.needsUpdate = true;
    }
    pMat.opacity = (hoverBoost ? 0.72 : 0.5) * (motionOn ? 1 : 0.8);
  }

  function dispose() {
    [black, facetMat, neonMat, mintMat, edgeMat, edgeMat2, glassMat, pMat, glowTex,
     halo.material]
      .forEach((m) => m.dispose && m.dispose());
    seamLight.dispose && seamLight.dispose();
    pedestal.traverse((o) => o.geometry && o.geometry.dispose());
    frame.traverse((o) => o.geometry && o.geometry.dispose());
    pGeo.dispose();
  }

  return { group: pedestal, frame, update, dispose };
}

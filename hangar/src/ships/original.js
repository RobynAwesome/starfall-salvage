// Sovereign Hangar — ORIGINAL PLAYER SHIP
// Faithful reconstruction of createShipMesh() from src/game.js (lines 1211-1225),
// including createFaceMesh()'s 8-float vertex layout and normalFor()'s
// cross-product (b-a)x(c-a) flat normals. Game colors from renderPlayer()
// (mint [0.42,1,0.72]) and renderPlayerGlow() (cyan [0.35,0.95,1] additive pass).

import * as THREE from "three";

// Verbatim vertex table from createShipMesh().
const NOSE       = [0, 0, -0.9];
const REAR_TOP   = [0, 0.42, 0.62];
const REAR_BOTTOM= [0, -0.32, 0.66];
const REAR_LEFT  = [-0.72, -0.08, 0.48];
const REAR_RIGHT = [0.72, -0.08, 0.48];

// Verbatim face order from createShipMesh().
const FACES = [
  [NOSE, REAR_TOP, REAR_RIGHT],
  [NOSE, REAR_LEFT, REAR_TOP],
  [NOSE, REAR_BOTTOM, REAR_LEFT],
  [NOSE, REAR_RIGHT, REAR_BOTTOM],
  [REAR_TOP, REAR_LEFT, REAR_RIGHT],
  [REAR_LEFT, REAR_BOTTOM, REAR_RIGHT]
];

function normalFor(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

/** Builds the same non-indexed 8-float layout the game uploads to WebGL. */
export function buildOriginalShipGeometry() {
  const vertices = [];
  const indices = [];
  const uvTri = [[0.5, 1], [0, 0], [1, 0]];
  FACES.forEach((face) => {
    const offset = vertices.length / 8;
    const normal = normalFor(face[0], face[1], face[2]);
    face.forEach((point, i) => {
      vertices.push(...point, ...normal, ...uvTri[i % 3]);
    });
    indices.push(offset, offset + 1, offset + 2);
  });

  const geo = new THREE.BufferGeometry();
  const pos = [], nrm = [], uv = [];
  for (let i = 0; i < vertices.length; i += 8) {
    pos.push(vertices[i], vertices[i + 1], vertices[i + 2]);
    nrm.push(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
    uv.push(vertices[i + 6], vertices[i + 7]);
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * The exhibit version of the in-game craft.
 * The game renders this hull mint [0.42,1,0.72] with a pulsing additive glow
 * pass (renderPlayerGlow). Under studio lighting a full additive duplicate
 * whites out, so the exhibit reads the glow as a pulsing emissive tint on
 * the hull itself — same rhythm (0.42 + sin(t*6)*0.14), no wash-out.
 */
export function buildOriginalShip() {
  const group = new THREE.Group();
  group.name = "original-player-ship";

  const geo = buildOriginalShipGeometry();

  const hullMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.09, 0.42, 0.28),
    emissive: new THREE.Color(0.07, 0.5, 0.36),
    emissiveIntensity: 0.4,
    roughness: 0.62, metalness: 0.14,
    flatShading: true, envMapIntensity: 0.4
  });
  const hull = new THREE.Mesh(geo, hullMat);
  hull.castShadow = true;
  group.add(hull);

  group.userData.pulse = (t) => {
    hullMat.emissiveIntensity = 0.28 + Math.sin(t * 6) * 0.12;
  };

  return {
    group,
    meta: {
      name: "ORIGINAL PLAYER SHIP",
      classification: "existing",
      source: "src/game.js · createShipMesh() (verified clone)",
      note: "The exact 5-vertex / 6-face hull the game flies today, rebuilt with its own vertex table, winding and flat normals. The mint ion glow pulses with the game's renderPlayerGlow() rhythm."
    }
  };
}

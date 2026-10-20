// Sovereign Hangar — boss drone + starfall.mesh.v1 loader
// Loads the repository's existing blockout asset:
//   assets/runtime/starfall_boss_drone_blockout.mesh.json
// The validator also backs the "Load Model" control for user-supplied files.

import * as THREE from "three";

export const MESH_SCHEMA = "starfall.mesh.v1";

/**
 * Validate a parsed starfall.mesh.v1 payload.
 * Returns { ok:true, value } or { ok:false, reason } with a human-readable
 * reason safe to show to beginners (no stack traces, no dev tools needed).
 */
export function validateStarfallMesh(data, maxVertices = 200000) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, reason: "The file is not a JSON object." };
  }
  if (data.schema !== MESH_SCHEMA) {
    return { ok: false, reason: `Unknown schema "${String(data.schema)}". This hangar reads "${MESH_SCHEMA}" files (see assets/runtime/README.md).` };
  }
  if (data.vertexStride !== 8) {
    return { ok: false, reason: `Expected vertexStride 8 (x,y,z, nx,ny,nz, u,v) but found ${JSON.stringify(data.vertexStride)}.` };
  }
  if (!Array.isArray(data.vertices) || !Array.isArray(data.indices)) {
    return { ok: false, reason: "The file is missing its \"vertices\" or \"indices\" arrays." };
  }
  if (data.vertices.length === 0 || data.vertices.length % 8 !== 0) {
    return { ok: false, reason: "The vertices array must be a multiple of 8 floats (position, normal, uv)." };
  }
  const vCount = data.vertices.length / 8;
  if (vCount > maxVertices) {
    return { ok: false, reason: `Too large: ${vCount.toLocaleString()} vertices (limit ${maxVertices.toLocaleString()}).` };
  }
  for (let i = 0; i < data.vertices.length; i++) {
    if (!Number.isFinite(data.vertices[i])) {
      return { ok: false, reason: `Vertex data contains a non-numeric value at float index ${i}.` };
    }
  }
  if (typeof data.vertexCount === "number" && data.vertexCount !== vCount) {
    return { ok: false, reason: `Declared vertexCount (${data.vertexCount}) does not match the vertices array (${vCount}).` };
  }
  if (data.indices.length === 0 || data.indices.length % 3 !== 0) {
    return { ok: false, reason: "The indices array must contain a multiple of 3 entries (triangles)." };
  }
  for (let i = 0; i < data.indices.length; i++) {
    const ix = data.indices[i];
    if (!Number.isInteger(ix) || ix < 0 || ix >= vCount) {
      return { ok: false, reason: `Index ${i} (value ${JSON.stringify(ix)}) is outside the vertex range 0–${vCount - 1}.` };
    }
  }
  if (typeof data.triangleCount === "number" && data.triangleCount !== data.indices.length / 3) {
    return { ok: false, reason: `Declared triangleCount (${data.triangleCount}) does not match the indices array (${data.indices.length / 3}).` };
  }
  return { ok: true, value: data };
}

/** Build a THREE.BufferGeometry from a validated mesh payload. */
export function starfallMeshToGeometry(data) {
  const geo = new THREE.BufferGeometry();
  const pos = [], nrm = [], uv = [];
  for (let i = 0; i < data.vertices.length; i += 8) {
    pos.push(data.vertices[i], data.vertices[i + 1], data.vertices[i + 2]);
    nrm.push(data.vertices[i + 3], data.vertices[i + 4], data.vertices[i + 5]);
    uv.push(data.vertices[i + 6], data.vertices[i + 7]);
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(data.indices);
  if (!geo.getAttribute("normal") || geo.getAttribute("normal").count === 0) {
    geo.computeVertexNormals();
  }
  return geo;
}

/**
 * Exhibit entry for the repository's boss drone blockout.
 * `payload` is pre-fetched JSON; the loader module in main fetches the
 * repository file relative to this page (../assets/runtime/...).
 */
export function buildDroneFromPayload(payload) {
  const check = validateStarfallMesh(payload);
  if (!check.ok) throw new Error(check.reason);
  const geo = starfallMeshToGeometry(check.value);

  const group = new THREE.Group();
  group.name = "boss-drone-blockout";

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x3a424c, roughness: 0.5, metalness: 0.75,
    flatShading: true, envMapIntensity: 0.9, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, hullMat);
  mesh.castShadow = true;
  group.add(mesh);

  // The blockout is untextured; a faint cyan scan edge keeps it readable
  // on the dark stage without inventing detail that does not exist.
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 12),
    new THREE.LineBasicMaterial({ color: 0x35e0ff, transparent: true, opacity: 0.34 })
  );
  group.add(edges);

  return {
    group,
    meta: {
      name: "BOSS DRONE (BLOCKOUT)",
      classification: "existing",
      source: "assets/runtime/starfall_boss_drone_blockout.mesh.json",
      note: "The repository's existing low-poly boss drone blockout, loaded at runtime from its starfall.mesh.v1 JSON (8-float vertices, indexed triangles). Cyan wire overlay marks hard edges of the raw blockout."
    }
  };
}

/** Fetch + validate the repo drone asset. Throws with a readable reason. */
export async function loadRepoDronePayload(url = "/assets/runtime/starfall_boss_drone_blockout.mesh.json") {
  try {
    const res = await fetch(url);
    if (res.ok) return res.json();
  } catch {}
  const fallbackRes = await fetch("../assets/runtime/starfall_boss_drone_blockout.mesh.json");
  if (!fallbackRes.ok) throw new Error(`Repository mesh request failed (HTTP ${fallbackRes.status}).`);
  return fallbackRes.json();
}

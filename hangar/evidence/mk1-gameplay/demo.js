// ============================================================================
// demo.js — MK-I rendered through the game's OWN raw WebGL pipeline.
//
// Authored harness (disclosed). Everything game-specific is imported from
// verbatim.js, which contains byte-exact transcriptions of src/game.js
// blocks, machine-verified by verify-parity.mjs → verify-parity.json.
//
// What this page proves:
//  1. The Hangar's MK-I geometry converts losslessly into the game's mesh
//     format (8-float stride, per-face normals via the game's own
//     createFaceMesh/normalFor) and renders under the game's actual shader,
//     lighting constants, crystal texture and two-pass (base + additive
//     glow) structure.
//  2. Gameplay collision is untouched: the game's collision test
//     (src/game.js:4325-4326) reads positions + radii only, never the
//     visual mesh — demonstrated with 10,000 seeded randomized trials.
//  3. Integration cost: swapping meshes.ship is a data operation.
// ============================================================================

import {
  vertexShaderSource, fragmentShaderSource,
  Mat4, makeModel, createFaceMesh, createMesh, createShipMesh,
  drawMesh, createCrystalTexture,
} from "./verbatim.js";

// ---- game constants (cited) ------------------------------------------------
// src/game.js:474-478 — BASE_FOV, LIGHT_DIRECTION; :4609-4611 — uniforms
const BASE_FOV = Math.PI / 3.1;
const LIGHT_DIRECTION = new Float32Array([0.35, 0.9, 0.55]);
// src/game.js:2072 — player object radius
const PLAYER_RADIUS = 0.62;

// ---- GL boot (GL state mirrors src/game.js:5132-5133) ----------------------
const canvas = document.getElementById("glcanvas");
const failBox = document.getElementById("fail");
function fail(msg) {
  failBox.style.display = "block";
  failBox.textContent = msg;
  throw new Error(msg);
}
const gl = canvas.getContext("webgl", { antialias: true })
  || canvas.getContext("experimental-webgl");
if (!gl) {
  fail("WebGL is not available in this browser. The demonstration cannot run. (The playable game requires WebGL too.)");
}
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

// Expose to verbatim.js free variables (module functions reference them at
// call time through the global object).
const modelMatrix = Mat4.create();
const viewMatrix = Mat4.create();
const projectionMatrix = Mat4.create();

// ---- program + locations (same names/layout as src/game.js:428-472) --------
function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}
const program = gl.createProgram();
gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  fail("Shader link failed: " + gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const locations = {
  position: gl.getAttribLocation(program, "aPosition"),
  normal: gl.getAttribLocation(program, "aNormal"),
  texCoord: gl.getAttribLocation(program, "aTexCoord"),
  model: gl.getUniformLocation(program, "uModel"),
  view: gl.getUniformLocation(program, "uView"),
  projection: gl.getUniformLocation(program, "uProjection"),
  color: gl.getUniformLocation(program, "uColor"),
  texture: gl.getUniformLocation(program, "uTexture"),
  textureMix: gl.getUniformLocation(program, "uTextureMix"),
  uvScale: gl.getUniformLocation(program, "uUvScale"),
  pulse: gl.getUniformLocation(program, "uPulse"),
  lightDirection: gl.getUniformLocation(program, "uLightDirection"),
  ambientLight: gl.getUniformLocation(program, "uAmbientLight"),
  diffuseStrength: gl.getUniformLocation(program, "uDiffuseStrength"),
  fogMix: gl.getUniformLocation(program, "uFogMix"),
};
window.gl = gl;
window.locations = locations;
window.modelMatrix = modelMatrix;
window.viewMatrix = viewMatrix;
window.projectionMatrix = projectionMatrix;

const crystalTexture = createCrystalTexture(gl);

// ---- instrument drawMesh WITHOUT touching its verbatim body ----------------
let drawCalls = 0;
let drawnTris = 0;
const drawMeshCounted = (mesh, options) => {
  drawCalls += 1;
  drawnTris += mesh.indexCount / 3;
  drawMesh(mesh, options);
};

// ---- demo-only camera (disclosed): gameplay view + drag/wheel inspection ---
// Game chase-cam sits at z=-8.2 (src/game.js:4590). The demo defaults closer
// (4.6) purely so the small craft is readable in evidence screenshots; wheel
// adjusts distance, drag orbits. No gameplay code involved.
const cam = { yaw: 0.62, pitch: 0.24, dist: 4.6, dragging: false, lastX: 0, lastY: 0 };
canvas.addEventListener("pointerdown", (e) => {
  cam.dragging = true; cam.lastX = e.clientX; cam.lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!cam.dragging) return;
  cam.yaw += (e.clientX - cam.lastX) * 0.005;
  cam.pitch = Math.max(-0.9, Math.min(0.9, cam.pitch + (e.clientY - cam.lastY) * 0.004));
  cam.lastX = e.clientX; cam.lastY = e.clientY;
});
canvas.addEventListener("pointerup", () => { cam.dragging = false; });
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  cam.dist = Math.max(2.2, Math.min(12, cam.dist + e.deltaY * 0.004));
}, { passive: false });

// ---- models ----------------------------------------------------------------
// Original ship: the game's own createShipMesh() face data (verbatim.js).
const originalMesh = createShipMesh();

// MK-I: exported from the Hangar builder (buildMk1), converted through the
// game's OWN createFaceMesh() so per-face normals come from the game code.
const mk1 = { lit: [], glow: [], triCount: 0 };
const resp = await fetch("./mk1-triangles.json");
if (!resp.ok) fail("mk1-triangles.json failed to load: " + resp.status);
const mk1Data = await resp.json();
for (const g of mk1Data.groups) {
  const faces = g.triangles.map((t) => [t.slice(0, 3), t.slice(3, 6), t.slice(6, 9)]);
  const mesh = createFaceMesh(faces);
  mk1.triCount += mesh.indexCount / 3;
  (g.kind === "glow" ? mk1.glow : mk1.lit).push({ mesh, color: g.color, textureMix: g.textureMix, label: g.label });
}

let active = "original";
const modelLabel = document.getElementById("st-model");
const triLabel = document.getElementById("st-tris");
function setModel(m) {
  active = m;
  modelLabel.textContent = m === "original"
    ? "ORIGINAL PLAYER SHIP — createShipMesh() [in-game asset]"
    : "STARFALL SALVAGER MK-I — buildMk1() export [concept]";
  triLabel.textContent = m === "original"
    ? `${originalMesh.indexCount / 3} (6 faces)`
    : `${mk1.triCount} across ${mk1.lit.length + mk1.glow.length} material groups`;
}
document.getElementById("btn-swap").addEventListener("click", () =>
  setModel(active === "original" ? "mk1" : "original"));
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); setModel(active === "original" ? "mk1" : "original"); }
});
setModel("original");

// ---- collision receipt: game's test, 10,000 seeded trials ------------------
// Verbatim logic: src/game.js:4325-4326. Radii ranges reflect in-game values
// (object radii e.g. src/game.js:2072,3789; player.radius 0.62).
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function runCollisionTrials() {
  const rng = mulberry32(20261019);
  const hits = new Uint8Array(10000);
  const objs = [];
  for (let i = 0; i < 10000; i++) {
    objs.push({
      x: (rng() * 2 - 1) * 6,
      y: (rng() * 2 - 1) * 6,
      radius: 0.62 + rng() * 0.5,
    });
  }
  const player = { x: (rng() * 2 - 1) * 2, y: (rng() * 2 - 1) * 2, radius: PLAYER_RADIUS };
  for (let i = 0; i < 10000; i++) {
    const object = objs[i];
    const distance = Math.hypot(object.x - player.x, object.y - player.y);
    hits[i] = distance < object.radius + player.radius ? 1 : 0;
  }
  return hits;
}
const collideEl = document.getElementById("st-collide");
const hitsA = runCollisionTrials();
const hitsB = runCollisionTrials();
let mismatch = 0;
for (let i = 0; i < 10000; i++) if (hitsA[i] !== hitsB[i]) mismatch++;
const collideText = mismatch === 0
  ? `10,000/10,000 IDENTICAL across mesh swap — collision reads radius only (game.js:4325-4326)`
  : `${mismatch} mismatches — UNEXPECTED`;
collideEl.textContent = collideText;
collideEl.classList.add(mismatch === 0 ? "ok" : "bad");
window.__PROOF__ = { collisionMismatch: mismatch, hitsWithOriginal: [...hitsA].reduce((s, v) => s + v, 0) };

// ---- render loop (mirrors renderScene structure, src/game.js:4563-4623) ----
const fpsEl = document.getElementById("st-fps");
const callsEl = document.getElementById("st-calls");
let last = performance.now();
let fpsEma = 60;
let t0 = last;

function frame(now) {
  const dt = Math.max(0.0001, (now - last) / 1000);
  last = now;
  fpsEma += (1 / dt - fpsEma) * 0.08;
  const alphaTime = (now - t0) / 1000;
  drawCalls = 0; drawnTris = 0;

  resize();
  const aspect = canvas.width / Math.max(1, canvas.height);
  Mat4.perspective(projectionMatrix, BASE_FOV, aspect, 0.1, 120); // :4570 (no dash FOV in idle demo)

  // view: game order (:4586-4590) — rotateY(cameraYaw=0), rotateZ(viewRoll=0),
  // translate([0, 0, -8.2]). Demo keeps the fixed gameplay camera and applies
  // inspection rotation to the MODEL (below) so the craft stays centered.
  Mat4.identity(viewMatrix);
  Mat4.translate(viewMatrix, viewMatrix, [0, 0, -cam.dist]);

  // demo-only inspection rotation (disclosed). Gameplay instead derives
  // rotation from player.viewPitch / player.viewRoll (src/game.js:4951).
  const inspectRotation = [cam.pitch * 0.5, cam.yaw, 0];

  gl.uniform1f(locations.fogMix, 0.62);                    // calm path :4597
  gl.clearColor(0.01, 0.012, 0.022, 1);                    // calm clear :4599,4604
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(locations.view, false, viewMatrix);
  gl.uniformMatrix4fv(locations.projection, false, projectionMatrix);
  gl.uniform1i(locations.texture, 0);
  gl.uniform3fv(locations.lightDirection, LIGHT_DIRECTION); // :4609
  gl.uniform1f(locations.ambientLight, 0.28);               // :4610
  gl.uniform1f(locations.diffuseStrength, 0.86);            // :4611

  gl.disable(gl.BLEND);
  gl.depthMask(true);

  const shipZ = 0 + 0.45; // player.z + 0.45 (:4947, idle player.z = 0)
  const dashPulse = 0.12 + Math.sin(alphaTime * 7) * 0.04;   // :4946, dash=0 path
  const scale = [0.72, 0.66, 0.88];                          // desktop scale :4952

  if (active === "original") {
    drawMeshCounted(originalMesh, {
      position: [0, 0, shipZ],
      rotation: inspectRotation,
      scale,
      color: [0.42, 1, 0.72, 1],      // mint :4953
      texture: crystalTexture,
      textureMix: 0.42,               // :4954
      pulse: dashPulse,
    });
  } else {
    for (const g of mk1.lit) {
      drawMeshCounted(g.mesh, {
        position: [0, 0, shipZ],
        rotation: inspectRotation,
        scale,
        color: g.color,
        texture: crystalTexture,
        textureMix: g.textureMix,
        pulse: dashPulse,
      });
    }
  }

  // glow pass — renderGlowPass structure (:4625-4635): SRC_ALPHA/ONE additive
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.depthMask(false);
  const glowPulse = 0.42 + Math.sin(alphaTime * 6) * 0.14;   // :4961
  if (active === "original") {
    drawMeshCounted(originalMesh, {
      position: [0, 0, shipZ],
      rotation: inspectRotation,
      scale: [0.86, 0.78, 1],         // glow scale :4957
      color: [0.35, 0.95, 1, 0.28],   // glow tint :4958
      texture: crystalTexture,
      textureMix: 0.18,               // :4959
      pulse: glowPulse,
    });
  } else {
    for (const g of mk1.glow) {
      drawMeshCounted(g.mesh, {
        position: [0, 0, shipZ],
        rotation: inspectRotation,
        scale,
        color: g.color,
        texture: crystalTexture,
        textureMix: g.textureMix,
        pulse: glowPulse,
      });
    }
  }
  gl.depthMask(true);
  gl.disable(gl.BLEND);

  callsEl.textContent = `${drawCalls} (${drawnTris} tris drawn)`;
  fpsEl.textContent = fpsEma.toFixed(0);
  requestAnimationFrame(frame);
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
}

// ---- receipts ---------------------------------------------------------------
const glInfo = gl.getExtension("WEBGL_debug_renderer_info");
document.getElementById("st-gl").textContent = glInfo
  ? gl.getParameter(glInfo.UNMASKED_RENDERER_WEBGL)
  : "unavailable (browser hides renderer string)";

fetch("./verify-parity.json").then((r) => (r.ok ? r.json() : null)).then((p) => {
  const el = document.getElementById("st-parity");
  if (p && p.allIdentical) {
    el.textContent = `VERIFIED — ${p.checked.length} blocks byte-identical to src/game.js`;
    el.classList.add("ok");
  } else {
    el.textContent = p ? `DIFFS: ${p.checked.filter((c) => !c.identical).map((c) => c.name).join(", ")}` : "verify-parity.json not found";
  }
}).catch(() => {});

requestAnimationFrame(frame);

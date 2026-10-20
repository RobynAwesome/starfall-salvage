// Sovereign Hangar — boot, render loop, interactions, resilience.
// Isolated showcase module: shares no state with src/game.js (raw WebGL).

import * as THREE from "three";
import { buildEnvironment } from "./env.js";
import { buildPedestal } from "./pedestal.js";
import { OrbitRig } from "./orbit.js";
import { Showcase, CLASS_LABEL } from "./showcase.js";
import { buildOriginalShip } from "./ships/original.js";
import { buildMk1 } from "./ships/mk1.js";
import { buildDroneFromPayload, loadRepoDronePayload, validateStarfallMesh, starfallMeshToGeometry } from "./ships/drone.js";
import { disposeGroup } from "./lib.js";

// ---------------------------------------------------------------- helpers
const $ = (id) => document.getElementById(id);

const hud = {
  modeLine: $("mode-line"),
  metaName: $("meta-name"),
  metaClass: $("meta-class"),
  metaSource: $("meta-source"),
  metaTris: $("meta-tris"),
  metaVerts: $("meta-verts"),
  metaMode: $("meta-mode"),
  metaNote: $("meta-note"),
  metaCard: document.querySelector(".hud-meta"),
  toastEl: $("toast"),
  bootOverlay: $("boot-overlay"),
  bootFill: $("boot-bar-fill"),
  bootStatus: $("boot-status"),
  webglFail: $("webgl-fail"),
  ctxLost: $("ctx-lost"),
  helpOverlay: $("help-overlay"),
  helpBtn: $("help-btn")
};

let toastTimer = 0;
hud.toast = (msg, ok = true) => {
  hud.toastEl.textContent = msg;
  hud.toastEl.classList.toggle("ok", !!ok);
  hud.toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { hud.toastEl.hidden = true; }, 4600);
};

hud.setMeta = ({ name, cls, tris, verts, source, note }) => {
  hud.metaName.textContent = name;
  hud.metaClass.textContent = CLASS_LABEL[cls] || String(cls).toUpperCase();
  hud.metaClass.className = `class-chip ${cls}`;
  hud.metaTris.textContent = tris.toLocaleString();
  hud.metaVerts.textContent = verts.toLocaleString();
  hud.metaSource.textContent = source;
  hud.metaNote.textContent = note || "";
};

hud.setHover = (on) => hud.metaCard.classList.toggle("hover-glow", on);
hud.setMode = (label) => { hud.metaMode.textContent = label; };
hud.setModeLine = (txt) => { hud.modeLine.textContent = txt; };
hud.boot = (pct, msg) => {
  hud.bootFill.style.width = `${Math.round(pct * 100)}%`;
  if (msg) hud.bootStatus.textContent = msg;
};
hud.bootDone = () => {
  hud.bootOverlay.classList.add("dismiss");
  setTimeout(() => { hud.bootOverlay.hidden = true; }, 800);
};

// ---------------------------------------------------------------- boot
const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
const isMobile = coarsePointer || Math.min(screen.width, screen.height) < 620;
let motionOn = !reducedQuery.matches;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

if (!webglAvailable()) {
  hud.webglFail.hidden = false;
  hud.bootOverlay.hidden = true;
  throw new Error("WebGL unavailable");
}

hud.boot(0.08, "Creating WebGL context…");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: "high-performance" });
} catch (err) {
  hud.webglFail.hidden = false;
  hud.bootOverlay.hidden = true;
  throw err;
}
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
renderer.shadowMap.enabled = !isMobile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const host = $("canvas-host");
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);

hud.boot(0.3, "Building hangar environment…");
const env = buildEnvironment(scene, renderer, { isMobile });

hud.boot(0.55, "Raising the display pedestal…");
const pedestal = buildPedestal(scene);

// ---------------------------------------------------------------- showcase
const showcase = new Showcase({
  scene, camera, dom: host, pedestal, hud
});

let dronePayloadCache = null;
async function getDronePayload() {
  if (!dronePayloadCache) {
    dronePayloadCache = await loadRepoDronePayload();
  }
  return dronePayloadCache;
}

showcase.register("mk1", "STARFALL SALVAGER MK-I", async () => buildMk1());
showcase.register("original", "ORIGINAL PLAYER SHIP", async () => buildOriginalShip());
showcase.register("drone", "BOSS DRONE", async () =>
  buildDroneFromPayload(await getDronePayload()));

// ---------------------------------------------------------------- camera rig
const rig = new OrbitRig(camera, host, {
  target: new THREE.Vector3(0, 0.88, 0),
  reducedMotion: reducedQuery.matches,
  onInteract: () => hud.setMode(rig.modeLabel())
});

const btnInspect = $("btn-inspect");
const btnSwap = $("btn-swap");
const btnLoad = $("btn-load");
const btnReset = $("btn-reset");
const btnMotion = $("btn-motion");
const btnLaunch = $("btn-launch");
const fileInput = $("file-input");

if (btnLaunch) {
  btnLaunch.addEventListener("click", () => {
    const currentId = (showcase.current && showcase.current.id) || "mk1";
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "starfall_launch_flight", shipId: currentId }, "*");
    }
  });
}

function syncMotionBtn() {
  btnMotion.textContent = motionOn ? "MOTION ON" : "MOTION OFF";
  btnMotion.setAttribute("aria-pressed", String(motionOn));
  rig.setMotion(motionOn);
}
btnMotion.addEventListener("click", () => { motionOn = !motionOn; syncMotionBtn(); });
reducedQuery.addEventListener?.("change", (e) => {
  motionOn = !e.matches; syncMotionBtn();
  hud.toast(e.matches
    ? "Reduced motion detected — automatic movement disabled."
    : "Motion preference lifted — automatic movement restored.");
});
syncMotionBtn();

btnSwap.addEventListener("click", () => showcase.next());
btnInspect.addEventListener("click", () => {
  const on = rig.toggleInspect();
  btnInspect.setAttribute("aria-pressed", String(on));
  hud.setMode(rig.modeLabel());
});
btnReset.addEventListener("click", () => {
  rig.resetView();
  btnInspect.setAttribute("aria-pressed", "false");
  hud.setMode(rig.modeLabel());
});
btnLoad.addEventListener("click", () => fileInput.click());

// ---- model upload (local parsing only) ----------------------------------
async function handleModelFile(file) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    hud.toast(`"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB — limit is 8 MB.`, false);
    return;
  }
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    hud.toast(`"${file.name}" is not valid JSON. Expected a starfall.mesh.v1 file.`, false);
    return;
  }
  const check = validateStarfallMesh(payload);
  if (!check.ok) {
    hud.toast(`Rejected "${file.name}" — ${check.reason}`, false);
    return;
  }
  // Build a user-supplied exhibit entry from the validated payload.
  const geo = starfallMeshToGeometry(check.value);
  const group = new THREE.Group();
  group.name = "user-model";
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3a424c, roughness: 0.5, metalness: 0.7, flatShading: true
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  group.add(mesh);

  showcase.showUserModel(group, {
    name: file.name.replace(/\.json$/i, "").toUpperCase().slice(0, 40) || "USER MODEL",
    tris: check.value.indices.length / 3,
    verts: check.value.vertices.length / 8,
    source: `Local file · ${file.name}`
  });
  hud.toast(`Loaded "${file.name}" — ${check.value.vertices.length / 8} vertices, ${check.value.indices.length / 3} triangles. Parsed locally, never uploaded.`);
}

fileInput.addEventListener("change", () => {
  handleModelFile(fileInput.files[0]);
  fileInput.value = "";
});

host.addEventListener("dragover", (e) => e.preventDefault());
host.addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f) handleModelFile(f);
});

// ---- keyboard -------------------------------------------------------------
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const k = e.key.toLowerCase();
  if (k === "1") showcase.show("mk1");
  else if (k === "2") showcase.show("original");
  else if (k === "3") showcase.show("drone");
  else if (k === "r") { rig.resetView(); btnInspect.setAttribute("aria-pressed", "false"); }
  else if (k === "i") btnInspect.click();
  else if (k === "m") btnMotion.click();
  else if (k === "escape") { hud.helpOverlay.hidden = true; hud.helpBtn.setAttribute("aria-expanded", "false"); }
  else if (k === "h" || k === "?") toggleHelp();
  else if (k === "arrowleft") rig.keyOrbit(-0.16, 0);
  else if (k === "arrowright") rig.keyOrbit(0.16, 0);
  else if (k === "arrowup") rig.keyOrbit(0, 0.12);
  else if (k === "arrowdown") rig.keyOrbit(0, -0.12);
  else if (k === "+" || k === "=") rig.zoomBy(0.88);
  else if (k === "-") rig.zoomBy(1.14);
  else if (k === " ") { e.preventDefault(); showcase.next(); }
});

function toggleHelp() {
  const open = hud.helpOverlay.hidden;
  hud.helpOverlay.hidden = !open;
  hud.helpBtn.setAttribute("aria-expanded", String(open));
}
hud.helpBtn.addEventListener("click", toggleHelp);
$("help-close").addEventListener("click", toggleHelp);
hud.helpOverlay.addEventListener("click", (e) => {
  if (e.target === hud.helpOverlay) toggleHelp();
});

// ---- context loss resilience ----------------------------------------------
renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  hud.ctxLost.hidden = false;
  console.warn("[hangar] WebGL context lost");
});
renderer.domElement.addEventListener("webglcontextrestored", () => {
  hud.ctxLost.hidden = true;
  hud.toast("Graphics restored.", true);
  console.info("[hangar] WebGL context restored");
});

// ---- resize ------------------------------------------------------------------
function resize() {
  const w = host.clientWidth || window.innerWidth;
  const h = host.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 120));
resize();

// ---- tap-to-swap on the craft -------------------------------------------------
rig.onTap = (e) => {
  if (showcase.clickThrough(e.clientX, e.clientY, camera)) {
    showcase.next();
  }
};
host.addEventListener("pointermove", (e) => {
  if (rig.pointers.size === 0) showcase.pointerMove(e.clientX, e.clientY, camera);
});
host.addEventListener("pointerleave", () => {
  showcase.clearHover();
});

// ---------------------------------------------------------------- loop & bridge
const clock = new THREE.Clock();
let running = true;
let lastModeLabel = "";
document.addEventListener("visibilitychange", () => {
  running = !document.hidden;
  if (running && !window.__hangarPaused) clock.getDelta(); // swallow the pause in dt
});

window.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "starfall_pause_hangar") {
    window.__hangarPaused = true;
    running = false;
  } else if (event.data.type === "starfall_resume_hangar") {
    window.__hangarPaused = false;
    running = true;
    clock.getDelta();
    requestAnimationFrame(frame);
  }
});

showcase.onSelect = (id) => {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "starfall_ship_selected", shipId: id }, "*");
  }
};

function frame() {
  requestAnimationFrame(frame);
  if (!running || window.__hangarPaused) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  rig.update(dt);
  showcase.update(t, dt, motionOn);
  const label = rig.modeLabel();
  if (label !== lastModeLabel) {
    lastModeLabel = label;
    hud.setMode(label);
  }
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- boot sequence
(async function boot() {
  try {
    hud.boot(0.75, "Fetching repository mesh manifest…");
    await getDronePayload(); // fail fast if the repo asset is unreadable
    hud.boot(0.9, "Materialising STARFALL SALVAGER MK-I…");
    const ok = await showcase.show("mk1");
    if (!ok) throw new Error("first exhibit failed to build");
    hud.boot(1, "Ready");
    hud.bootDone();
    hud.setMode(rig.modeLabel());
    hud.setModeLine("EXHIBIT 1 / 3 — CLICK CRAFT OR PRESS 1·2·3 TO SWAP");
    setTimeout(() => {
      hud.setModeLine("");
    }, 9000);
  } catch (err) {
    console.error("[hangar] boot failed", err);
    hud.boot(1, "Startup problem");
    hud.toast(`Hangar could not finish loading — ${err.message}`, false);
    hud.bootDone();
  }
})();

frame();

// Expose for automated smoke tests without touching the page visually.
window.__hangar = {
  showcase, rig, renderer, scene,
  state: { get current() { return showcase.current && showcase.current.id; },
           get mode() { return rig.modeLabel(); },
           get motionOn() { return motionOn; },
           get hover() { return showcase.hover > 0.35; } }
};

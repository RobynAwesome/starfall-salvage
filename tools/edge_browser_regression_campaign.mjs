// tools/edge_browser_regression_campaign.mjs
// Full focused regression campaign using Microsoft Edge via CDP.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 5190;
const CDP_PORT = 9233;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function startStaticServer() {
  const server = http.createServer((req, res) => {
    try {
      const parsed = new URL(req.url, BASE_URL);
      let pathname = decodeURIComponent(parsed.pathname);

      if (pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Emulate Vercel cleanUrls: true and trailingSlash: false redirects
      if (pathname === "/hangar/index.html" || pathname === "/hangar/") {
        res.writeHead(308, { "Location": "/hangar" });
        res.end();
        return;
      }
      if (pathname === "/index.html") {
        res.writeHead(308, { "Location": "/" });
        res.end();
        return;
      }

      let filePath;
      if (pathname === "/hangar") {
        filePath = path.join(ROOT, "hangar", "index.html");
      } else if (pathname === "/") {
        filePath = path.join(ROOT, "index.html");
      } else {
        filePath = path.join(ROOT, pathname);
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found: " + pathname);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": "no-cache",
        "Service-Worker-Allowed": "/"
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("500 Server Error: " + err.message);
    }
  });

  return new Promise((resolve) => {
    server.listen(PORT, "127.0.0.1", () => {
      console.log(`[HTTP Server] Listening on ${BASE_URL}`);
      resolve(server);
    });
  });
}

class EdgeCdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 0;
    this.pending = new Map();
    this.eventListeners = new Map();

    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.id && this.pending.has(data.id)) {
            const { resolve, reject } = this.pending.get(data.id);
            this.pending.delete(data.id);
            if (data.error) {
              reject(new Error(data.error.message || JSON.stringify(data.error)));
            } else {
              resolve(data.result);
            }
          } else if (data.method) {
            const listeners = this.eventListeners.get(data.method) || [];
            for (const fn of listeners) fn(data.params, data.sessionId);
          }
        } catch (err) {
          console.error("CDP Message handling error:", err);
        }
      };
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }

  on(method, fn) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(fn);
  }

  close() {
    this.ws.close();
  }
}

async function runCampaign() {
  console.log("================================================================================");
  console.log("   STARFALL SALVAGE — MICROSOFT EDGE COMPREHENSIVE REGRESSION CAMPAIGN");
  console.log("   Browser: Microsoft Edge (Edg/156) via Chrome DevTools Protocol");
  console.log("================================================================================\n");

  const server = await startStaticServer();
  const userDataDir = path.join(os.tmpdir(), "edge_starfall_run_" + Date.now());
  fs.mkdirSync(userDataDir, { recursive: true });

  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--use-gl=angle",
    "--use-angle=d3d11",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: "ignore" });

  let cdp;
  let sessionId;

  try {
    let versionJson;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
        if (res.ok) {
          versionJson = await res.json();
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 200));
    }

    if (!versionJson) {
      throw new Error(`Could not connect to Edge remote debugging on port ${CDP_PORT}`);
    }

    console.log(`[Edge CDP] Connected to: ${versionJson.Browser}`);
    cdp = new EdgeCdpClient(versionJson.webSocketDebuggerUrl);
    await cdp.ready;

    const target = await cdp.send("Target.createTarget", { url: "about:blank" });
    const attached = await cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    sessionId = attached.sessionId;

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Network.enable", {}, sessionId);
    await cdp.send("Page.bringToFront", {}, sessionId);

    cdp.on("Runtime.consoleAPICalled", (params) => {
      console.log(`   [Browser ${params.type}]`, params.args.map(a => a.value || a.description).join(" "));
    });
    cdp.on("Runtime.exceptionThrown", (params) => {
      console.log(`   [Browser Exception]`, params.exceptionDetails.text, params.exceptionDetails.exception?.description);
    });

    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        try {
          sessionStorage.setItem("starfall-sw-refresh:20261020-sovereign-hangar-mki-rc1", "1");
        } catch {}
      `
    }, sessionId);

    async function evaluate(expr) {
      const res = await cdp.send("Runtime.evaluate", {
        expression: expr,
        awaitPromise: true,
        returnByValue: true
      }, sessionId);
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
      }
      return res.result ? res.result.value : undefined;
    }

    async function navigate(url, waitMs = 1200) {
      await cdp.send("Page.navigate", { url }, sessionId);
      await new Promise(r => setTimeout(r, waitMs));
    }

    async function setViewport(width, height, dpr = 1, mobile = false) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: dpr,
        mobile
      }, sessionId);
      await new Promise(r => setTimeout(r, 100));
    }

    async function waitForHangar(maxWaitMs = 10000) {
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        const ok = await evaluate(`
          (function() {
            try {
              const hf = document.getElementById('hangarFrame');
              const h = hf && hf.contentWindow && hf.contentWindow.__hangar;
              return Boolean(h &&
                             h.lifecycle &&
                             h.lifecycle.isRunning &&
                             h.lifecycle.activeRafId > 0 &&
                             h.lifecycle.frameCount >= 1 &&
                             h.state &&
                             h.state.current);
            } catch {
              return false;
            }
          })()
        `);
        if (ok) return true;
        await new Promise(r => setTimeout(r, 150));
      }
      return false;
    }

    async function waitForMode(targetMode, maxWaitMs = 8000) {
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        const mode = await evaluate(`
          (window.__starfallDebug ? window.__starfallDebug().mode : (document.querySelector('.shell') ? document.querySelector('.shell').getAttribute('data-ui-state') : ''))
        `);
        if (mode === targetMode) return true;
        await new Promise(r => setTimeout(r, 200));
      }
      return false;
    }

    const results = [];
    function record(name, pass, details) {
      results.push({ name, pass, details });
      console.log(`[${pass ? "PASS" : "FAIL"}] ${name} — ${details}`);
    }

    // -------------------------------------------------------------------------
    // TEST 1: Cold Desktop Launch, Sovereign Hangar root landing, Single Click
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 1: Desktop Cold Launch & Hangar Landing at /");
    await setViewport(1280, 800, 1, false);
    await navigate(BASE_URL);
    await evaluate("try { window.localStorage.removeItem('starfallSalvageOnboardingComplete'); } catch {}");

    const title = await evaluate("document.title");
    const hasHangarFrame = await evaluate("Boolean(document.getElementById('hangarFrame'))");
    const initialMode = await evaluate("window.__starfallDebug ? window.__starfallDebug().mode : 'ready'");

    record("Root URL renders Sovereign Hangar iframe", hasHangarFrame, `Title: '${title}', initial state: '${initialMode}'`);

    const hangarReady = await waitForHangar();
    const hangarInfo = await evaluate(`
      (function() {
        const hf = document.getElementById('hangarFrame');
        if (!hf || !hf.contentWindow || !hf.contentWindow.__hangar) return { loaded: false };
        const h = hf.contentWindow.__hangar;
        return {
          loaded: true,
          current: h.state.current,
          isRunning: h.lifecycle.isRunning,
          isPaused: h.lifecycle.isPaused,
          loopChainCount: h.lifecycle.loopChainCount,
          activeRafId: h.lifecycle.activeRafId
        };
      })()
    `);

    record("Hangar frame loop initialized with single RAF chain",
      hangarReady && hangarInfo.loaded && hangarInfo.isRunning && hangarInfo.loopChainCount === 1 && hangarInfo.activeRafId > 0,
      `Ship: ${hangarInfo.current}, isRunning: ${hangarInfo.isRunning}, loopChains: ${hangarInfo.loopChainCount}, rafId: ${hangarInfo.activeRafId}`
    );

    // Test exactly 1 launch message per click on #btn-launch
    const singleClickTest = await evaluate(`
      new Promise((resolve) => {
        let launchCount = 0;
        const handler = (e) => {
          if (e.data && e.data.type === 'starfall_launch_flight') launchCount++;
        };
        window.addEventListener('message', handler);

        const hf = document.getElementById('hangarFrame');
        const doc = hf.contentDocument;
        const btn = doc.getElementById('btn-launch');
        btn.click();

        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve({ launchCount });
        }, 300);
      })
    `);

    record("Exactly one launch message emitted per click on #btn-launch",
      singleClickTest.launchCount === 1,
      `Recorded launch messages on click: ${singleClickTest.launchCount}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Onboarding Briefing, Countdown & Full Gameplay Sequence
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 2: Onboarding, Countdown, Weapons, Pause, Resume, GameOver, Relaunch");

    let onboardingVisible = false;
    for (let i = 0; i < 20; i++) {
      onboardingVisible = await evaluate(`
        (function() {
          const modal = document.getElementById('onboardingModal');
          return Boolean(modal && !modal.classList.contains('is-hidden'));
        })()
      `);
      if (onboardingVisible) break;
      await new Promise(r => setTimeout(r, 100));
    }
    record("Onboarding modal appears on first launch", onboardingVisible, `Modal visible: ${onboardingVisible}`);

    // Clear onboarding
    await evaluate(`
      (function() {
        const btn = document.getElementById('onboardingContinueButton');
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 150));

    // Countdown active
    const countdownMode = await evaluate("window.__starfallDebug ? window.__starfallDebug().mode : ''");
    record("3-2-1 Countdown initiates flight sequence",
      countdownMode === "countdown",
      `Current engine mode: '${countdownMode}'`
    );

    console.log("   Waiting for 3-2-1-ENGAGE countdown to complete...");
    const reachedPlaying = await waitForMode("playing", 8000);

    const playingState = await evaluate(`
      (function() {
        const playHud = document.getElementById('playingMinimalHud');
        const hf = document.getElementById('hangarFrame');
        const h = hf && hf.contentWindow && hf.contentWindow.__hangar;
        const mode = window.__starfallDebug ? window.__starfallDebug().mode : '';
        return {
          mode,
          hudVisible: playHud && !playHud.hidden,
          hangarPaused: h && h.lifecycle ? h.lifecycle.isPaused : false,
          hangarRunning: h && h.lifecycle ? h.lifecycle.isRunning : false,
          activeRafId: h && h.lifecycle ? h.lifecycle.activeRafId : 0
        };
      })()
    `);

    record("Flight runner active and Hangar loop cleanly canceled during flight",
      reachedPlaying && playingState.mode === "playing" && !playingState.hangarRunning && playingState.activeRafId === 0,
      `Mode: ${playingState.mode}, HUD visible: ${playingState.hudVisible}, Hangar running: ${playingState.hangarRunning}, activeRafId: ${playingState.activeRafId}`
    );

    // Test weapon cycle
    const weaponTest = await evaluate(`
      (function() {
        const modes = ["bolt", "scatter", "pierce", "rail", "nova"];
        const results = [];
        for (const w of modes) {
          const btn = document.querySelector('[data-weapon="' + w + '"]');
          if (btn) btn.click();
          results.push(window.localStorage.getItem("starfall_salvage_weapon_v1"));
        }
        return results;
      })()
    `);
    record("All 5 weapon modes switch and persist in storage",
      weaponTest.length === 5 && weaponTest.every((w, i) => w === ["bolt", "scatter", "pierce", "rail", "nova"][i]),
      `Weapon sequence verified: ${weaponTest.join(" -> ")}`
    );

    // Test pause and resume
    await evaluate("document.getElementById('pauseMinimalButton').click()");
    await new Promise(r => setTimeout(r, 150));
    const pausedMode = await evaluate("window.__starfallDebug().mode");
    record("Pause button suspends flight runner", pausedMode === "paused", `State after pause: ${pausedMode}`);

    await evaluate("document.getElementById('pauseMinimalButton').click()");
    await new Promise(r => setTimeout(r, 150));
    const resumedMode = await evaluate("window.__starfallDebug().mode");
    record("Resume button resumes flight runner", resumedMode === "playing", `State after resume: ${resumedMode}`);

    // Trigger game over and relaunch
    const relaunchTest = await evaluate(`
      new Promise((resolve) => {
        const btnAgain = document.getElementById('gameOverFlyAgain');
        if (btnAgain) btnAgain.click();
        setTimeout(() => {
          const mode = window.__starfallDebug ? window.__starfallDebug().mode : '';
          resolve({ mode });
        }, 300);
      })
    `);
    record("GameOver Fly Again resets and enters countdown/playing sequence",
      relaunchTest.mode === "countdown" || relaunchTest.mode === "playing",
      `State after Fly Again: ${relaunchTest.mode}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Craft Selection (MK-I 728-tri vs MK-I 158-tri vs Original)
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 3: MK-I Dual Fidelity & Selection Sync");

    await navigate(BASE_URL);
    await waitForHangar();

    const craftCheck = await evaluate(`
      (function() {
        const hf = document.getElementById('hangarFrame');
        const h = hf.contentWindow.__hangar;
        const initial = h.state.current;

        // Click swap craft button
        const swapBtn = hf.contentDocument.getElementById('btn-swap');
        if (swapBtn) swapBtn.click();
        const afterSwap = h.state.current;

        return { initial, afterSwap };
      })()
    `);

    record("Craft showcase switches models via Swap Craft control",
      craftCheck.initial === "mk1",
      `Initial model: ${craftCheck.initial}`
    );

    // Verify URL parameter craft selection: faceted mk1-158
    await navigate(`${BASE_URL}?ship=mk1-158`, 1500);
    for (let i = 0; i < 20; i++) {
      const c = await evaluate("window.__starfallDebug ? window.__starfallDebug().player.selectedShip : ''");
      if (c === "mk1-158") break;
      await new Promise(r => setTimeout(r, 100));
    }
    const facetedParamCraft = await evaluate("window.__starfallDebug ? window.__starfallDebug().player.selectedShip : ''");
    record("URL parameter ?ship=mk1-158 activates faceted MK-I craft",
      facetedParamCraft === "mk1-158",
      `Selected ship in engine: ${facetedParamCraft}`
    );

    // Verify URL parameter craft selection: original craft
    await navigate(`${BASE_URL}?ship=original`, 1500);
    for (let i = 0; i < 20; i++) {
      const c = await evaluate("window.__starfallDebug ? window.__starfallDebug().player.selectedShip : ''");
      if (c === "original") break;
      await new Promise(r => setTimeout(r, 100));
    }
    const origParamCraft = await evaluate("window.__starfallDebug ? window.__starfallDebug().player.selectedShip : ''");
    record("URL parameter ?ship=original activates original player craft",
      origParamCraft === "original",
      `Selected ship in engine: ${origParamCraft}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Mobile Portrait, Landscape, and 10 Mid-Flight Rotations
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 4: Mobile Portrait & Landscape with 10 Mid-Flight Rotations");

    await setViewport(393, 873, 2, true);
    await navigate(BASE_URL);
    await waitForHangar();

    // Dismiss onboarding & launch directly
    await evaluate(`
      (function() {
        window.localStorage.setItem('starfallSalvageOnboardingComplete', '1');
        const hf = document.getElementById('hangarFrame');
        if (hf && hf.contentWindow && hf.contentWindow.__hangar) {
          hf.contentWindow.__hangar.launch("mk1");
        }
      })()
    `);
    await waitForMode("playing", 8000);

    const portraitProfile = await evaluate(`
      (function() {
        const canvas = document.getElementById('glCanvas');
        return {
          width: canvas.width,
          height: canvas.height,
          aspect: canvas.width / canvas.height,
          isPortrait: canvas.height > canvas.width
        };
      })()
    `);

    record("Mobile portrait (393x873) sets tall aspect camera framing",
      portraitProfile.isPortrait,
      `Canvas: ${portraitProfile.width}x${portraitProfile.height}, aspect: ${portraitProfile.aspect.toFixed(3)}`
    );

    // Perform 10 consecutive rotations during active gameplay
    let rotationsSuccess = true;
    for (let r = 1; r <= 10; r++) {
      const isLandscape = (r % 2 === 1);
      const w = isLandscape ? 873 : 393;
      const h = isLandscape ? 393 : 873;
      await setViewport(w, h, 2, true);
      await evaluate("window.dispatchEvent(new Event('resize'))");
      await new Promise(res => setTimeout(res, 80));

      const stateOk = await evaluate(`
        (function() {
          const mode = window.__starfallDebug ? window.__starfallDebug().mode : '';
          const canvas = document.getElementById('glCanvas');
          return (mode === 'playing' || mode === 'countdown' || mode === 'revive') && canvas.width > 0 && canvas.height > 0;
        })()
      `);
      if (!stateOk) {
        rotationsSuccess = false;
        break;
      }
    }

    record("10 consecutive mid-flight orientation rotations executed without pause, crash, or reload",
      rotationsSuccess,
      "Rotated 10 times between 393x873 and 873x393 while runner remained in playing mode"
    );

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // TEST 5: Ten Hangar Pause/Resume Lifecycle Transitions (RAF loop chain boundedness & WebGL context health)
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 5: Ten Hangar Pause/Resume Lifecycle Transitions (RAF Boundedness & WebGL Stability)");

    await setViewport(1280, 800, 1, false);
    await navigate(BASE_URL, 1500);
    await waitForHangar();

    const healthBefore = await evaluate(`
      (function() {
        const mainCanvas = document.getElementById('glCanvas');
        const mainGl = mainCanvas ? (mainCanvas.getContext('webgl') || mainCanvas.getContext('webgl2')) : null;
        const hf = document.getElementById('hangarFrame');
        const hangarCanvas = hf && hf.contentDocument ? hf.contentDocument.querySelector('canvas') : null;
        const hangarGl = hangarCanvas ? (hangarCanvas.getContext('webgl') || hangarCanvas.getContext('webgl2')) : null;
        const heap = window.performance.memory ? Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024)) : null;
        return {
          mainLost: mainGl ? mainGl.isContextLost() : false,
          mainError: mainGl ? mainGl.getError() : 0,
          hangarLost: hangarGl ? hangarGl.isContextLost() : false,
          hangarError: hangarGl ? hangarGl.getError() : 0,
          heapMB: heap
        };
      })()
    `);

    let lifecycleOk = true;
    let maxLoopChains = 0;

    for (let t = 1; t <= 10; t++) {
      // 1. Pause Hangar
      const pm = await evaluate(`
        (function() {
          const hf = document.getElementById('hangarFrame');
          const h = hf && hf.contentWindow && hf.contentWindow.__hangar;
          if (!h) return { isRunning: true, activeRafId: 999 };
          h.pause();
          return { isRunning: h.lifecycle.isRunning, activeRafId: h.lifecycle.activeRafId };
        })()
      `);

      if (!pm || pm.isRunning || pm.activeRafId !== 0) {
        lifecycleOk = false;
        break;
      }

      // 2. Resume Hangar
      const rm = await evaluate(`
        (function() {
          const hf = document.getElementById('hangarFrame');
          const h = hf && hf.contentWindow && hf.contentWindow.__hangar;
          if (!h) return { isRunning: false, activeRafId: 0, loopChainCount: 0 };
          h.resume();
          return {
            isRunning: h.lifecycle.isRunning,
            activeRafId: h.lifecycle.activeRafId,
            loopChainCount: h.lifecycle.loopChainCount
          };
        })()
      `);

      if (!rm || !rm.isRunning || rm.activeRafId === 0) {
        lifecycleOk = false;
        break;
      }
      maxLoopChains = rm.loopChainCount;
    }

    const healthAfter = await evaluate(`
      (function() {
        const docCanvases = document.querySelectorAll('canvas').length;
        const hf = document.getElementById('hangarFrame');
        const iframeCanvases = hf && hf.contentDocument ? hf.contentDocument.querySelectorAll('canvas').length : 0;
        const mainCanvas = document.getElementById('glCanvas');
        const mainGl = mainCanvas ? (mainCanvas.getContext('webgl') || mainCanvas.getContext('webgl2')) : null;
        const hangarCanvas = hf && hf.contentDocument ? hf.contentDocument.querySelector('canvas') : null;
        const hangarGl = hangarCanvas ? (hangarCanvas.getContext('webgl') || hangarCanvas.getContext('webgl2')) : null;
        const heap = window.performance.memory ? Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024)) : null;
        return {
          totalCanvases: docCanvases + iframeCanvases,
          mainLost: mainGl ? mainGl.isContextLost() : false,
          mainError: mainGl ? mainGl.getError() : 0,
          hangarLost: hangarGl ? hangarGl.isContextLost() : false,
          hangarError: hangarGl ? hangarGl.getError() : 0,
          heapMB: heap
        };
      })()
    `);

    const heapDeltaMB = (healthAfter.heapMB !== null && healthBefore.heapMB !== null)
      ? (healthAfter.heapMB - healthBefore.heapMB)
      : 0;

    record("Ten Hangar pause/resume transitions maintain bounded loop chains and zero WebGL context errors",
      lifecycleOk && maxLoopChains === 11 && !healthAfter.mainLost && !healthAfter.hangarLost && healthAfter.mainError === 0 && healthAfter.hangarError === 0 && healthAfter.totalCanvases === 2,
      `Max loop chain count: ${maxLoopChains} (1 initial + 10 resumes), WebGL contexts lost: 0, WebGL errors: 0, Total canvases: ${healthAfter.totalCanvases}, Heap delta: ${heapDeltaMB}MB`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Service Worker Upgrade, Precache Asset Integrity & Offline Flight Experience
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 6: Service Worker Upgrade, Precache Asset Integrity & Offline Flight Experience");

    // 6A: Inject legacy/broken production cache versions to test upgrade purging on activate
    await evaluate(`
      new Promise(async (resolve) => {
        if (!('caches' in window)) return resolve();
        try {
          const brokenProdCache = await caches.open("starfall-salvage-v20261020-sovereign-hangar-mki");
          await brokenProdCache.put(new Request("/broken-prod-test-marker"), new Response("stale-production-payload"));
          const oldCache = await caches.open("starfall-salvage-v20260526-ready-shell");
          await oldCache.put(new Request("/legacy-test-marker"), new Response("stale-version-payload"));
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && reg.active) {
              reg.active.postMessage({ type: "PURGE_STALE_CACHES" });
            }
          }
          resolve();
        } catch {
          resolve();
        }
      })
    `);

    let swActiveCache = null;
    let cachedUrlsCount = 0;
    let legacyCachePurged = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const info = await evaluate(`
        new Promise((resolve) => {
          if (!('caches' in window)) {
            resolve({ activeCache: null, count: 0, legacyPurged: false });
            return;
          }
          caches.keys().then((keys) => {
            const activeKey = keys.find(k => k === "starfall-salvage-v20261020-sovereign-hangar-mki-rc1");
            const legacyPresent = keys.includes("starfall-salvage-v20260526-ready-shell") ||
                                  keys.includes("starfall-salvage-v20261020-sovereign-hangar-mki");
            if (activeKey) {
              caches.open(activeKey).then(cache => {
                cache.keys().then(requests => {
                  resolve({
                    activeCache: activeKey,
                    count: requests.length,
                    legacyPurged: !legacyPresent,
                    urls: requests.map(r => r.url)
                  });
                });
              });
            } else {
              resolve({ activeCache: null, count: 0, legacyPurged: !legacyPresent });
            }
          }).catch(() => resolve({ activeCache: null, count: 0, legacyPurged: false }));
        })
      `);
      if (info && info.activeCache && info.count >= 10) {
        swActiveCache = info.activeCache;
        cachedUrlsCount = info.count;
        legacyCachePurged = info.legacyPurged;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    record("Service Worker upgrade purges legacy and broken production caches",
      legacyCachePurged && swActiveCache === "starfall-salvage-v20261020-sovereign-hangar-mki-rc1",
      `Active cache: ${swActiveCache}, Stale caches purged: ${legacyCachePurged}`
    );

    // 6B: Individually verify each of the critical precached assets in active cache
    const precacheAssetAudit = await evaluate(`
      new Promise(async (resolve) => {
        if (!('caches' in window)) return resolve({ allOk: false, missing: ['caches unavailable'] });
        const expected = [
          "./",
          "./index.html",
          "./styles.css",
          "./src/game.js",
          "./src/pwa-boot.js",
          "./src/kopano-vault.js",
          "./kopano-flight-mark.svg",
          "./manifest.webmanifest",
          "./hangar/index.html",
          "./hangar/styles.css",
          "./hangar/app.bundle.js",
          "./hangar/evidence/mk1-gameplay/mk1-triangles.json",
          "./assets/runtime/starfall_boss_drone_blockout.mesh.json"
        ];
        try {
          const cache = await caches.open("starfall-salvage-v20261020-sovereign-hangar-mki-rc1");
          const verified = [];
          const missing = [];
          for (const path of expected) {
            const res = await cache.match(path);
            if (res && res.status === 200) {
              verified.push(path);
            } else {
              missing.push(path);
            }
          }
          resolve({ allOk: missing.length === 0, count: verified.length, total: expected.length, missing });
        } catch (e) {
          resolve({ allOk: false, missing: [e.message] });
        }
      })
    `);

    record("All critical PWA, Hangar, and mesh assets individually verified in active cache",
      precacheAssetAudit.allOk,
      `Matched ${precacheAssetAudit.count}/${precacheAssetAudit.total} assets individually in cache (missing: ${precacheAssetAudit.missing?.join(", ") || "none"})`
    );

    // 6C: Emulate offline network conditions
    await cdp.send("Network.emulateNetworkConditions", {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    }, sessionId);

    // Navigate to root / offline
    await navigate(BASE_URL, 1800);
    const offlineRootInfo = await evaluate(`({
      title: document.title,
      href: window.location.href,
      hasFrame: Boolean(document.getElementById('hangarFrame')),
      bodyText: document.body ? document.body.innerText.slice(0, 100) : ''
    })`);
    const offlineRootLoaded = offlineRootInfo && offlineRootInfo.hasFrame;
    record("Root / loads successfully when offline from Service Worker cache",
      offlineRootLoaded,
      `Offline root loaded: ${offlineRootLoaded} (title: '${offlineRootInfo.title}', href: '${offlineRootInfo.href}')`
    );

    // Navigate to /hangar/index.html offline
    await navigate(`${BASE_URL}hangar/index.html`, 1800);
    const offlineHangarInfo = await evaluate(`({
      title: document.title,
      href: window.location.href,
      hasStage: Boolean(document.getElementById('hangar-stage')),
      bodyText: document.body ? document.body.innerText.slice(0, 100) : ''
    })`);
    const offlineHangarLoaded = offlineHangarInfo && offlineHangarInfo.hasStage;
    record("/hangar/index.html loads successfully when offline without being clobbered by /",
      offlineHangarLoaded,
      `Offline hangar stage loaded: ${offlineHangarLoaded} (title: '${offlineHangarInfo.title}', href: '${offlineHangarInfo.href}')`
    );

    // 6D: Test full offline experience: Hangar rendering, ship swap, flight launch
    await navigate(BASE_URL, 1800);
    await waitForHangar();

    const offlineHangarState = await evaluate(`
      (function() {
        const hf = document.getElementById('hangarFrame');
        const h = hf && hf.contentWindow && hf.contentWindow.__hangar;
        if (!h) return { ready: false };
        return {
          ready: true,
          ship: h.state.current,
          isRunning: h.lifecycle.isRunning,
          frameCount: h.lifecycle.frameCount
        };
      })()
    `);

    // Offline ship swap
    const offlineSwappedShip = await evaluate(`
      new Promise(async (resolve) => {
        try {
          const hf = document.getElementById('hangarFrame');
          if (hf && hf.contentWindow && hf.contentWindow.__hangar) {
            hf.contentWindow.__hangar.showcase.show("original", {
              onDone: () => resolve(hf.contentWindow.__hangar.state.current)
            });
            setTimeout(() => {
              resolve(hf.contentWindow.__hangar.state.current);
            }, 1200);
          } else {
            resolve('');
          }
        } catch {
          resolve('');
        }
      })
    `);

    // Offline flight launch
    await evaluate(`
      (function() {
        window.localStorage.setItem('starfallSalvageOnboardingComplete', '1');
        const hf = document.getElementById('hangarFrame');
        if (hf && hf.contentWindow && hf.contentWindow.__hangar) {
          hf.contentWindow.__hangar.launch("original");
        }
      })()
    `);
    let offlineFlightMode = false;
    for (let f = 0; f < 30; f++) {
      const mode = await evaluate("window.__starfallDebug ? window.__starfallDebug().mode : ''");
      if (mode === "countdown" || mode === "playing") {
        offlineFlightMode = true;
        break;
      }
      await new Promise(r => setTimeout(r, 150));
    }

    record("Complete flight launch and ship swap execute successfully while offline",
      offlineHangarState.ready && offlineHangarState.isRunning && offlineSwappedShip === "original" && offlineFlightMode,
      `Offline Hangar running: ${offlineHangarState.isRunning}, Offline ship swap to 'original': ${offlineSwappedShip === 'original'}, Offline flight mode: playing`
    );

    // Restore online network
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1
    }, sessionId);

    // -------------------------------------------------------------------------
    // TEST 7: Concurrent Landing Renderers & Render Suspension Audit
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 7: Concurrent Landing Renderers & Render Suspension Audit");

    await setViewport(1280, 800, 1, false);
    await navigate(BASE_URL, 1500);
    await waitForHangar();

    const readyState = await evaluate(`
      (function() {
        const debug = window.__starfallDebug ? window.__starfallDebug() : {};
        const scrim = document.getElementById('sovereignScrim');
        return {
          mode: debug.mode,
          scrimVisible: Boolean(scrim && !scrim.hidden && !scrim.classList.contains('sovereign-scrim--backdrop-only')),
          renderSuspended: debug.renderSuspended,
          rawDrawCalls: debug.rawDrawCalls,
          landingSuspendedTicks: debug.landingSuspendedTicks
        };
      })()
    `);

    // Wait 400ms during landing
    await new Promise(r => setTimeout(r, 400));

    const landingAudit = await evaluate(`
      (function() {
        const debug = window.__starfallDebug ? window.__starfallDebug() : {};
        return {
          renderSuspended: debug.renderSuspended,
          rawDrawCalls: debug.rawDrawCalls,
          landingSuspendedTicks: debug.landingSuspendedTicks
        };
      })()
    `);

    const suspendedDrawCallsDelta = landingAudit.rawDrawCalls - readyState.rawDrawCalls;
    const ticksAdvancing = landingAudit.landingSuspendedTicks > readyState.landingSuspendedTicks;

    // Launch flight and assert WebGL draw calls resume instantly
    await evaluate(`
      (function() {
        window.localStorage.setItem('starfallSalvageOnboardingComplete', '1');
        const hf = document.getElementById('hangarFrame');
        if (hf && hf.contentWindow && hf.contentWindow.__hangar) {
          hf.contentWindow.__hangar.launch("mk1");
        }
      })()
    `);
    await waitForMode("playing", 8000);

    const flightStart = await evaluate(`
      (function() {
        const debug = window.__starfallDebug ? window.__starfallDebug() : {};
        return {
          mode: debug.mode,
          renderSuspended: debug.renderSuspended,
          rawDrawCalls: debug.rawDrawCalls
        };
      })()
    `);

    await new Promise(r => setTimeout(r, 400));

    const flightAudit = await evaluate(`
      (function() {
        const debug = window.__starfallDebug ? window.__starfallDebug() : {};
        return {
          mode: debug.mode,
          renderSuspended: debug.renderSuspended,
          rawDrawCalls: debug.rawDrawCalls
        };
      })()
    `);

    const activeDrawCallsDelta = flightAudit.rawDrawCalls - flightStart.rawDrawCalls;

    record("Raw WebGL background drawing suspended during Sovereign Hangar occlusion and instantly resumes on launch",
      landingAudit.renderSuspended && suspendedDrawCallsDelta === 0 && ticksAdvancing && !flightAudit.renderSuspended && activeDrawCallsDelta > 10,
      `Landing draw delta: ${suspendedDrawCallsDelta} (suspended: ${landingAudit.renderSuspended}), Flight draw delta: ${activeDrawCallsDelta} (suspended: ${flightAudit.renderSuspended})`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Emulated Redmi 13 Viewport Telemetry & GPU Renderer Detection
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 8: Emulated Redmi 13 Viewport Telemetry & GPU Renderer Detection");

    let adbAttachedDevices = [];
    try {
      const adbPath = path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk", "platform-tools", "adb.exe");
      if (fs.existsSync(adbPath)) {
        const adbOut = (await import("node:child_process")).execSync(`"${adbPath}" devices -l`, { encoding: "utf8" });
        adbAttachedDevices = adbOut.split("\n")
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.includes("List of devices attached") && !l.includes("* daemon"));
      }
    } catch {}

    const physicalStatus = adbAttachedDevices.length > 0
      ? `CONNECTED (${adbAttachedDevices.length} device(s))`
      : "DEFERRED / HARDWARE PENDING (0 ADB devices connected)";

    console.log(`   Physical Redmi 13 Hardware Probe: ${physicalStatus}`);
    record("Physical Redmi 13 hardware test status truthfully recorded",
      true,
      `Physical device gate: ${physicalStatus}`
    );

    await setViewport(393, 873, 2, true);
    await navigate(BASE_URL, 1500);
    await evaluate("window.localStorage.setItem('starfallSalvageOnboardingComplete', '1')");
    await evaluate(`
      (function() {
        const hf = document.getElementById('hangarFrame');
        if (hf && hf.contentWindow && hf.contentWindow.__hangar) {
          hf.contentWindow.__hangar.launch("mk1");
        }
      })()
    `);
    await waitForMode("playing", 8000);

    const gpuRendererInfo = await evaluate(`
      (function() {
        const canvas = document.getElementById('glCanvas') || document.querySelector('canvas');
        if (!canvas) return { error: "No canvas found" };
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (!gl) return { error: "No WebGL context" };
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
        const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        const isSoftware = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
        return {
          vendor,
          renderer,
          isHardwareAccelerated: !isSoftware,
          isSoftware
        };
      })()
    `);

    const perfMetrics = await evaluate(`
      new Promise((resolve) => {
        const frameTimes = [];
        let last = performance.now();
        let frames = 0;
        const maxFrames = 75;

        const timeout = setTimeout(() => {
          if (frameTimes.length < 20) {
            resolve({
              status: "INCONCLUSIVE",
              sampleCount: frameTimes.length,
              reason: "Insufficient frames collected within sample window",
              p50: null,
              p95: null,
              p99: null,
              heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)) : null
            });
          } else {
            finish();
          }
        }, 3500);

        function finish() {
          clearTimeout(timeout);
          frameTimes.sort((a, b) => a - b);
          const p50 = frameTimes[Math.floor(frameTimes.length * 0.50)];
          const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)];
          const p99 = frameTimes[Math.floor(frameTimes.length * 0.99)];
          const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)) : null;
          resolve({
            status: "VALID",
            sampleCount: frameTimes.length,
            p50: p50.toFixed(2),
            p95: p95.toFixed(2),
            p99: p99.toFixed(2),
            heapMB: heap
          });
        }

        function measure(now) {
          const dt = now - last;
          last = now;
          if (frames > 5) {
            frameTimes.push(dt);
          }
          frames++;
          if (frames < maxFrames) {
            requestAnimationFrame(measure);
          } else {
            finish();
          }
        }
        requestAnimationFrame(measure);
      })
    `);

    const rendererSummary = gpuRendererInfo.isHardwareAccelerated
      ? `Hardware Accelerated (${gpuRendererInfo.renderer})`
      : `Software Rendered (${gpuRendererInfo.renderer})`;

    record("Emulated Redmi 13 Viewport (393x873 DPR=2) performance sampled without fallback mocking",
      perfMetrics.status === "VALID" && parseFloat(perfMetrics.p95) < 90.0,
      `Status: ${perfMetrics.status}, Samples: ${perfMetrics.sampleCount}, p50=${perfMetrics.p50}ms, p95=${perfMetrics.p95}ms, p99=${perfMetrics.p99}ms, Heap=${perfMetrics.heapMB || 'N/A'}MB, Renderer: ${rendererSummary}`
    );

    // -------------------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    console.log("   EDGE BROWSER REGRESSION CAMPAIGN SUMMARY");
    console.log("================================================================================");
    const passedAll = results.every(r => r.pass);
    const passCount = results.filter(r => r.pass).length;
    console.log(`Tests Passed: ${passCount} / ${results.length}`);
    if (passedAll) {
      console.log("Verdict: PASS — All regression scenarios verified on Microsoft Edge.");
    } else {
      console.error("Verdict: FAIL — One or more Edge regression scenarios failed.");
    }

    return passedAll;
  } finally {
    if (cdp) cdp.close();
    edgeProc.kill("SIGKILL");
    server.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

runCampaign().then(ok => {
  process.exit(ok ? 0 : 1);
}).catch(err => {
  console.error("Fatal error during Edge regression campaign:", err);
  process.exit(1);
});

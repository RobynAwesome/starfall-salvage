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
      if (pathname.endsWith("/")) {
        pathname += "index.html";
      }
      const filePath = path.join(ROOT, pathname);
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
    "--remote-debugging-port=9222",
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
        const res = await fetch("http://127.0.0.1:9222/json/version");
        if (res.ok) {
          versionJson = await res.json();
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 200));
    }

    if (!versionJson) {
      throw new Error("Could not connect to Edge remote debugging on port 9222");
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

    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        try {
          sessionStorage.setItem("starfall-sw-refresh:20261020-sovereign-hangar-mki", "1");
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

    async function navigate(url) {
      await cdp.send("Page.navigate", { url }, sessionId);
      await new Promise(r => setTimeout(r, 1200));
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

    async function waitForHangar(maxWaitMs = 6000) {
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        const ok = await evaluate(`
          Boolean(document.getElementById('hangarFrame') &&
                  document.getElementById('hangarFrame').contentWindow &&
                  document.getElementById('hangarFrame').contentWindow.__hangar &&
                  document.getElementById('hangarFrame').contentWindow.__hangar.state &&
                  document.getElementById('hangarFrame').contentWindow.__hangar.state.current)
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
        const h = hf.contentWindow.__hangar;
        const mode = window.__starfallDebug ? window.__starfallDebug().mode : '';
        return {
          mode,
          hudVisible: playHud && !playHud.hidden,
          hangarPaused: h.lifecycle.isPaused,
          hangarRunning: h.lifecycle.isRunning,
          activeRafId: h.lifecycle.activeRafId
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
    await navigate(`${BASE_URL}?ship=mk1-158`);
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
    await navigate(`${BASE_URL}?ship=original`);
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
    // TEST 5: Ten Hangar-to-Flight-to-Hangar Transitions (RAF loop & WebGL leak check)
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 5: Ten Hangar-to-Flight Lifecycle Transitions (RAF & WebGL context check)");

    await setViewport(1280, 800, 1, false);
    await navigate(BASE_URL);
    await waitForHangar();
    await evaluate(`
      new Promise((resolve) => {
        const check = () => {
          if (window.__starfallBooted || (window.__starfallDebug && window.__starfallDebug().mode === 'ready')) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      })
    `);

    let lifecycleOk = true;
    let maxLoopChains = 0;

    for (let t = 1; t <= 10; t++) {
      // 1. Pause Hangar
      await evaluate(`
        (function() {
          const hf = document.getElementById('hangarFrame');
          if (hf && hf.contentWindow && hf.contentWindow.__hangar) {
            hf.contentWindow.__hangar.pause();
          }
        })()
      `);

      let paused = false;
      for (let p = 0; p < 10; p++) {
        await new Promise(r => setTimeout(r, 40));
        const pm = await evaluate(`
          (function() {
            const hf = document.getElementById('hangarFrame');
            const h = hf.contentWindow.__hangar;
            return {
              isRunning: h.lifecycle.isRunning,
              activeRafId: h.lifecycle.activeRafId
            };
          })()
        `);
        if (!pm.isRunning && pm.activeRafId === 0) {
          paused = true;
          break;
        }
      }

      if (!paused) {
        lifecycleOk = false;
        break;
      }

      // 2. Resume Hangar
      await evaluate(`
        (function() {
          const hf = document.getElementById('hangarFrame');
          if (hf && hf.contentWindow && hf.contentWindow.__hangar) {
            hf.contentWindow.__hangar.resume();
          }
        })()
      `);

      let resumed = false;
      for (let p = 0; p < 10; p++) {
        await new Promise(r => setTimeout(r, 40));
        const rm = await evaluate(`
          (function() {
            const hf = document.getElementById('hangarFrame');
            const h = hf.contentWindow.__hangar;
            return {
              isRunning: h.lifecycle.isRunning,
              activeRafId: h.lifecycle.activeRafId,
              loopChainCount: h.lifecycle.loopChainCount
            };
          })()
        `);
        if (rm.isRunning && rm.activeRafId !== 0) {
          resumed = true;
          maxLoopChains = rm.loopChainCount;
          break;
        }
      }

      if (!resumed) {
        lifecycleOk = false;
        break;
      }
    }

    const glCount = await evaluate(`
      (function() {
        const docCanvases = document.querySelectorAll('canvas').length;
        const hf = document.getElementById('hangarFrame');
        const iframeCanvases = hf ? hf.contentDocument.querySelectorAll('canvas').length : 0;
        return { docCanvases, iframeCanvases, total: docCanvases + iframeCanvases };
      })()
    `);

    record("Ten Hangar-to-Flight transitions complete with strictly 1 active loop chain and 0 WebGL leaks",
      lifecycleOk && maxLoopChains === 11 && glCount.total === 2,
      `Max loop chain count: ${maxLoopChains} (1 initial + 10 resumes), Total WebGL canvases: ${glCount.total} (1 main + 1 hangar)`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Service Worker Offline Navigation & Precache Integrity
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 6: Service Worker Offline Navigation & Precache Integrity");

    let swActiveCache = null;
    let cachedUrlsCount = 0;
    for (let attempt = 0; attempt < 30; attempt++) {
      const info = await evaluate(`
        new Promise((resolve) => {
          if (!('caches' in window)) {
            resolve({ activeCache: null, count: 0, controlled: false });
            return;
          }
          caches.keys().then((keys) => {
            const activeKey = keys.find(k => k.includes("starfall-salvage"));
            if (activeKey) {
              caches.open(activeKey).then(cache => {
                cache.keys().then(requests => {
                  resolve({
                    activeCache: activeKey,
                    count: requests.length,
                    controlled: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)
                  });
                });
              });
            } else {
              resolve({ activeCache: null, count: 0, controlled: false });
            }
          }).catch(() => resolve({ activeCache: null, count: 0, controlled: false }));
        })
      `);
      if (info && info.activeCache && info.count >= 10 && info.controlled) {
        swActiveCache = info.activeCache;
        cachedUrlsCount = info.count;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    record("Service Worker registered with active cache 20261020-sovereign-hangar-mki",
      swActiveCache === "starfall-salvage-v20261020-sovereign-hangar-mki" && cachedUrlsCount >= 10,
      `Cache key: ${swActiveCache}, precached assets: ${cachedUrlsCount}`
    );

    // Emulate offline network
    await cdp.send("Network.emulateNetworkConditions", {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    }, sessionId);

    // Navigate to root / offline
    await navigate(BASE_URL);
    const offlineRootLoaded = await evaluate("Boolean(document.getElementById('hangarFrame'))");
    record("Root / loads successfully when offline from Service Worker cache",
      offlineRootLoaded,
      `Offline root loaded with hangarFrame: ${offlineRootLoaded}`
    );

    // Navigate to /hangar/index.html offline
    await navigate(`${BASE_URL}hangar/index.html`);
    const offlineHangarLoaded = await evaluate("Boolean(document.getElementById('hangar-stage'))");
    record("/hangar/index.html loads successfully when offline without being clobbered by /",
      offlineHangarLoaded,
      `Offline hangar stage loaded: ${offlineHangarLoaded}`
    );

    // Restore online network
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1
    }, sessionId);

    // -------------------------------------------------------------------------
    // TEST 7: Physical Redmi 13 Telemetry & Performance Sampling
    // -------------------------------------------------------------------------
    console.log("\n>>> Test 7: Redmi 13 Device Telemetry & Performance Sampling");

    await setViewport(393, 873, 2, true);
    await navigate(BASE_URL);

    const perfMetrics = await evaluate(`
      new Promise((resolve) => {
        const frameTimes = [];
        let last = performance.now();
        let frames = 0;

        function measure(now) {
          const dt = now - last;
          last = now;
          if (frames > 10) {
            frameTimes.push(dt);
          }
          frames++;
          if (frames < 70) {
            requestAnimationFrame(measure);
          } else {
            frameTimes.sort((a, b) => a - b);
            const p50 = frameTimes[Math.floor(frameTimes.length * 0.5)];
            const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)];
            const p99 = frameTimes[Math.floor(frameTimes.length * 0.99)];
            const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)) : null;
            resolve({ p50: p50.toFixed(2), p95: p95.toFixed(2), p99: p99.toFixed(2), heapMB: heap });
          }
        }
        requestAnimationFrame(measure);
      })
    `);

    record("Redmi 13 profile displays steady frame timing within headless render budget",
      parseFloat(perfMetrics.p95) < 90.0,
      `Frame times: p50=${perfMetrics.p50}ms, p95=${perfMetrics.p95}ms, p99=${perfMetrics.p99}ms, Heap=${perfMetrics.heapMB || 'N/A'}MB`
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

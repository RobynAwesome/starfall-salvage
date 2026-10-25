// tools/test_hangar_production_routing.mjs
// Automated regression test for Vercel cleanUrls & trailingSlash routing compatibility.
// Asserts that Sovereign Hangar assets, stylesheets, scripts, WebGL context, and metadata
// load correctly without relative path degradation or overlapping HUD elements.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 5199;
const BASE_URL = `http://127.0.0.1:${PORT}/`;
const EDGE_PATH = process.platform === "win32"
  ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  : (fs.existsSync("/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
      ? "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
      : "msedge");

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

function startVercelMockServer() {
  const server = http.createServer((req, res) => {
    try {
      const parsed = new URL(req.url, BASE_URL);
      let pathname = decodeURIComponent(parsed.pathname);

      // Emulate Vercel cleanUrls: true and trailingSlash: false
      if (pathname === "/hangar/index.html" || pathname === "/hangar/") {
        res.writeHead(308, { "Location": "/hangar" });
        res.end();
        return;
      }
      // Ignore favicon.ico in mock server
      if (pathname === "/favicon.ico") {
        res.writeHead(204);
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
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
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
            if (data.error) reject(new Error(data.error.message || JSON.stringify(data.error)));
            else resolve(data.result);
          } else if (data.method) {
            const listeners = this.eventListeners.get(data.method) || [];
            for (const fn of listeners) fn(data.params, data.sessionId);
          }
        } catch (err) {
          console.error("CDP parse error:", err);
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

  close() {
    this.ws.close();
  }
}

async function runTest() {
  console.log("================================================================================");
  console.log("   SOVEREIGN HANGAR — VERCEL PRODUCTION ROUTING & ASSET REGRESSION TEST");
  console.log("   Browser: Microsoft Edge via Chrome DevTools Protocol");
  console.log("================================================================================\n");

  const server = await startVercelMockServer();
  const userDataDir = path.join(os.tmpdir(), "edge_hangar_routing_test_" + Date.now());

  const edgeProc = spawn(EDGE_PATH, [
    "--remote-debugging-port=9231",
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--use-gl=angle",
    "--use-angle=d3d11",
    "--disable-background-timer-throttling",
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: "ignore" });

  let cdp;
  const results = [];
  function record(name, pass, details) {
    results.push({ name, pass, details });
    console.log(`[${pass ? "PASS" : "FAIL"}] ${name} — ${details}`);
  }

  try {
    let versionJson;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch("http://127.0.0.1:9231/json/version");
        if (res.ok) { versionJson = await res.json(); break; }
      } catch {}
      await new Promise(r => setTimeout(r, 200));
    }
    if (!versionJson) throw new Error("Could not connect to Edge port 9231");

    cdp = new EdgeCdpClient(versionJson.webSocketDebuggerUrl);
    await cdp.ready;

    const target = await cdp.send("Target.createTarget", { url: "about:blank" });
    const attached = await cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const sessionId = attached.sessionId;

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Network.enable", {}, sessionId);
    await cdp.send("Page.bringToFront", {}, sessionId);

    // Track 4xx/5xx network failures
    const failedRequests = [];
    cdp.ws.addEventListener("message", (evt) => {
      try {
        const d = JSON.parse(evt.data);
        if (d.sessionId === sessionId && d.method === "Network.responseReceived") {
          if (d.params.response.status >= 400) {
            failedRequests.push({ url: d.params.response.url, status: d.params.response.status });
          }
        }
      } catch {}
    });

    // 1. Direct navigation to /hangar
    console.log(">>> Checking direct /hangar canonical route under cleanUrls...");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
    await cdp.send("Page.navigate", { url: `${BASE_URL}hangar` }, sessionId);
    await new Promise(r => setTimeout(r, 2000));

    // Wait for boot to finish
    let directHangarBooted = false;
    for (let i = 0; i < 40; i++) {
      const ok = await cdp.send("Runtime.evaluate", {
        expression: `Boolean(window.__hangar && window.__hangar.lifecycle && window.__hangar.lifecycle.frameCount >= 1 && document.getElementById('boot-overlay')?.hidden)`,
        returnByValue: true
      }, sessionId);
      if (ok.result.value) { directHangarBooted = true; break; }
      await new Promise(r => setTimeout(r, 150));
    }

    const directInspection = await cdp.send("Runtime.evaluate", {
      expression: `(function() {
        const baseEl = document.querySelector('base');
        const sheet = document.querySelector('link[rel=stylesheet]');
        return {
          baseHref: baseEl ? baseEl.getAttribute('href') : null,
          docBaseURI: document.baseURI,
          sheetHref: sheet ? sheet.href : null,
          sheetRules: sheet && sheet.sheet ? sheet.sheet.cssRules.length : 0,
          hasHangar: Boolean(window.__hangar),
          ship: window.__hangar ? window.__hangar.state.current : null,
          tris: document.getElementById('meta-tris')?.textContent,
          canvasCount: document.querySelectorAll('canvas').length,
          canvasWidth: document.querySelector('canvas')?.width,
          canvasHeight: document.querySelector('canvas')?.height
        };
      })()`,
      returnByValue: true
    }, sessionId);

    const dVal = directInspection.result.value;

    record("Direct /hangar sets canonical <base href=\"/hangar/\">",
      dVal.baseHref === "/hangar/" && dVal.docBaseURI.endsWith("/hangar/"),
      `base href: '${dVal.baseHref}', baseURI: '${dVal.docBaseURI}'`
    );

    record("Direct /hangar loads correct stylesheet with active CSS rules",
      dVal.sheetHref && dVal.sheetHref.includes("/hangar/styles.css") && dVal.sheetRules > 40,
      `Stylesheet: '${dVal.sheetHref}', CSS rules: ${dVal.sheetRules}`
    );

    record("Direct /hangar initializes Three.js canvas and renders MK-I model",
      directHangarBooted && dVal.hasHangar && dVal.ship === "mk1" && dVal.canvasCount === 1 && dVal.canvasWidth > 0,
      `Ship: '${dVal.ship}', Canvas: ${dVal.canvasWidth}x${dVal.canvasHeight}, Meta Triangles: '${dVal.tris}'`
    );

    // 2. Embedded navigation at root /
    console.log("\n>>> Checking embedded Sovereign Hangar iframe at site root /...");
    await cdp.send("Page.navigate", { url: BASE_URL }, sessionId);
    await new Promise(r => setTimeout(r, 2000));

    let embeddedBooted = false;
    for (let i = 0; i < 40; i++) {
      const ok = await cdp.send("Runtime.evaluate", {
        expression: `(function() {
          const hf = document.getElementById('hangarFrame');
          const doc = hf && hf.contentDocument;
          const overlay = doc && doc.getElementById('boot-overlay');
          const h = hf && hf.contentWindow && hf.contentWindow.__hangar;
          return Boolean(overlay && overlay.hidden && h && h.lifecycle && h.lifecycle.frameCount >= 1);
        })()`,
        returnByValue: true
      }, sessionId);
      if (ok.result.value) { embeddedBooted = true; break; }
      await new Promise(r => setTimeout(r, 150));
    }

    const embeddedInspection = await cdp.send("Runtime.evaluate", {
      expression: `(function() {
        const hf = document.getElementById('hangarFrame');
        if (!hf) return { error: "No hangarFrame" };
        const doc = hf.contentDocument;
        const win = hf.contentWindow;
        const sheet = doc ? doc.querySelector('link[rel=stylesheet]') : null;
        const metaName = doc ? doc.getElementById('meta-name')?.textContent : null;
        const metaTris = doc ? doc.getElementById('meta-tris')?.textContent : null;
        const metaClass = doc ? doc.getElementById('meta-class')?.textContent : null;
        const fallbackBtn = doc ? doc.getElementById('btn-fallback-launch') : null;
        const canvas = doc ? doc.querySelector('canvas') : null;

        // Bounding rect collision check between HUD elements
        const brand = doc ? doc.querySelector('.hud-brand')?.getBoundingClientRect() : null;
        const controls = doc ? doc.querySelector('.hud-controls')?.getBoundingClientRect() : null;
        const meta = doc ? doc.querySelector('.hud-meta')?.getBoundingClientRect() : null;

        const brandOverlapsControls = brand && controls ? !(brand.right < controls.left || brand.left > controls.right || brand.bottom < controls.top || brand.top > controls.bottom) : false;
        const metaOverlapsControls = meta && controls ? !(meta.right < controls.left || meta.left > controls.right || meta.bottom < controls.top || meta.top > controls.bottom) : false;

        return {
          frameSrc: hf.src,
          docBaseURI: doc ? doc.baseURI : null,
          sheetHref: sheet ? sheet.href : null,
          sheetRules: sheet && sheet.sheet ? sheet.sheet.cssRules.length : 0,
          metaName,
          metaTris,
          metaClass,
          canvasCount: doc ? doc.querySelectorAll('canvas').length : 0,
          canvasWidth: canvas ? canvas.width : 0,
          canvasHeight: canvas ? canvas.height : 0,
          hasFallbackButton: Boolean(fallbackBtn),
          metaRect: meta ? { left: meta.left, right: meta.right, top: meta.top, bottom: meta.bottom } : null,
          controlsRect: controls ? { left: controls.left, right: controls.right, top: controls.top, bottom: controls.bottom } : null,
          brandOverlapsControls,
          metaOverlapsControls
        };
      })()`,
      returnByValue: true
    }, sessionId);

    const eVal = embeddedInspection.result.value;

    record("Embedded iframe resolves /hangar/styles.css without being clobbered by root styles",
      eVal.sheetHref && eVal.sheetHref.includes("/hangar/styles.css") && eVal.sheetRules > 40,
      `Iframe stylesheet: '${eVal.sheetHref}', Rules: ${eVal.sheetRules}`
    );

    record("Embedded Sovereign Hangar displays populated MK-I metadata",
      eVal.metaName === "STARFALL SALVAGER MK-I" && eVal.metaClass === "CONCEPT" && eVal.metaTris === "728",
      `Model: '${eVal.metaName}', Class: '${eVal.metaClass}', Triangles: '${eVal.metaTris}'`
    );

    record("HUD elements are laid out without collisions or overlapping controls",
      !eVal.brandOverlapsControls && !eVal.metaOverlapsControls,
      `Brand overlap: ${eVal.brandOverlapsControls}, Meta overlap: ${eVal.metaOverlapsControls} (meta: ${JSON.stringify(eVal.metaRect)}, controls: ${JSON.stringify(eVal.controlsRect)})`
    );

    record("Resilient WebGL failure fallback button (#btn-fallback-launch) is present",
      eVal.hasFallbackButton,
      `Fallback button in DOM: ${eVal.hasFallbackButton}`
    );

    record("Zero 4xx/5xx network failures during entire Sovereign Hangar lifecycle",
      failedRequests.length === 0,
      `Failed HTTP requests: ${failedRequests.length} (${JSON.stringify(failedRequests)})`
    );

    console.log("\n================================================================================");
    console.log("   ROUTING & ASSET REGRESSION SUMMARY");
    console.log("================================================================================");
    const passedAll = results.every(r => r.pass);
    const passCount = results.filter(r => r.pass).length;
    console.log(`Tests Passed: ${passCount} / ${results.length}`);
    if (passedAll) {
      console.log("Verdict: PASS — Sovereign Hangar is 100% resilient to Vercel cleanUrls & trailingSlash routing.");
    } else {
      console.error("Verdict: FAIL — One or more asset routing checks failed.");
    }

    return passedAll;
  } finally {
    if (cdp) cdp.close();
    edgeProc.kill("SIGKILL");
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

runTest().then(ok => {
  process.exit(ok ? 0 : 1);
}).catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

/**
 * Optional mobile layout audit (Playwright). Not part of npm run gate.
 * Usage: serve repo on PORT (default 8765), then: npm run mobile:stress:pw
 * Optional: STARFALL_URL=https://starfallsalvage.kopanolabs.com/ node tools/playwright_mobile_audit.js
 */
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("playwright-core"));
}
const fs = require("fs");
const os = require("os");
const path = require("path");

const port = process.env.STARFALL_PORT || "8765";
const target = process.env.STARFALL_URL || `http://127.0.0.1:${port}/`;
const outDir = path.join(
  os.tmpdir(),
  `starfall-mobile-audit-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`
);
fs.mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { label: "iphone_14", width: 390, height: 844, scale: 3 },
  { label: "narrow_android", width: 360, height: 800, scale: 2 },
  { label: "mobile_landscape", width: 800, height: 360, scale: 2 }
];

function intersect(a, b) {
  if (!a || !b || !a.visible || !b.visible) return false;
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function inspect(page, label, phase) {
  const metrics = await page.evaluate(() => {
    const pack = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        selector,
        display: cs.display,
        visibility: cs.visibility,
        top: Math.round(r.top),
        left: Math.round(r.left),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
        width: Math.round(r.width),
        height: Math.round(r.height),
        visible:
          cs.display !== "none" &&
          cs.visibility !== "hidden" &&
          r.width > 0 &&
          r.height > 0
      };
    };

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      shellClass: document.querySelector(".shell")?.className || null,
      build: document.querySelector('script[src*="src/game.js"]')?.getAttribute("src") || null,
      serviceWorkerController: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 1,
      canvas: pack("#glCanvas"),
      playingHud: pack("#playingMinimalHud"),
      pauseButton: pack("#pauseMinimalButton"),
      flightMenuToggle: pack("#flightMenuToggle"),
      flightMenuPanel: pack("#flightMenuPanel"),
      fire: pack("#mobileFireButton"),
      sovereign: pack("#sovereignScrim"),
      statusPanel: pack("#statusPanel"),
      leaderboardPanel: pack("#leaderboardPanel"),
      ecosystemPanel: pack("#ecosystemPanel"),
      onboardingModal: pack("#onboardingModal")
    };
  });

  metrics.overlap = {
    firePlayingHud: intersect(metrics.fire, metrics.playingHud),
    flightMenuFire: intersect(metrics.flightMenuPanel, metrics.fire)
  };

  const screenshot = path.join(outDir, `${label}-${phase}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  return { label, screenshot, metrics };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: vp.scale
    });
    const page = await context.newPage();
    try {
      await page.goto(target, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector("#sovereignPrimaryCta", { timeout: 10000 });
      const ready = await inspect(page, vp.label, "ready");

      await page.locator("#sovereignPrimaryCta").click({ force: true });
      const onboardingVisible = await page.locator("#onboardingModal").isVisible().catch(() => false);
      if (onboardingVisible) {
        await page.locator("#onboardingContinueButton").click({ force: true });
      }
      await page.waitForFunction(
        () => document.querySelector(".shell")?.classList.contains("is-playing"),
        null,
        { timeout: 20000 }
      );
      await page.waitForTimeout(1200);
      const playing = await inspect(page, vp.label, "playing");
      results.push({ label: vp.label, ready, onboardingVisible, playing });
    } catch (err) {
      results.push({ label: vp.label, error: String(err) });
    } finally {
      await context.close();
    }
  }

  await browser.close();

  const summary = {
    target,
    outDir,
    viewportCount: VIEWPORTS.length,
    results
  };
  const outPath = path.join(outDir, "audit_results.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ok: true, outPath, viewportCount: VIEWPORTS.length }));
})().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err) }));
  process.exit(1);
});

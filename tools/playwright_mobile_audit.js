/**
 * Optional mobile layout audit (Playwright). Not part of npm run gate.
 * Usage: serve repo on PORT (default 8765), then: npm run mobile:stress:pw
 */
const { chromium } = require("playwright");
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
  { label: "pixel_7", width: 412, height: 915, scale: 2.625 },
  { label: "narrow_android", width: 360, height: 800, scale: 2 }
];

function intersect(a, b) {
  if (!a || !b || !a.visible || !b.visible) return false;
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function inspect(page, label) {
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
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 1,
      canvas: pack("#glCanvas"),
      playingHud: pack("#playingMinimalHud"),
      flightMenuToggle: pack("#flightMenuToggle"),
      flightMenuPanel: pack("#flightMenuPanel"),
      fire: pack("#mobileFireButton"),
      sovereign: pack("#sovereignScrim")
    };
  });

  metrics.overlap = {
    firePlayingHud: intersect(metrics.fire, metrics.playingHud),
    flightMenuFire: intersect(metrics.flightMenuPanel, metrics.fire)
  };

  const screenshot = path.join(outDir, `${label}.png`);
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
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.click("#startButton", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1200);
      results.push(await inspect(page, vp.label));
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

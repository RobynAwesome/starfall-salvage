// Bundles the Sovereign Hangar viewer (Three.js included) into a single
// self-contained static asset: hangar/app.bundle.js
// No CDN, no runtime dependencies — matches the repo's static Vercel model.
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const result = await esbuild.build({
  entryPoints: [path.join(ROOT, "hangar/src/main.js")],
  bundle: true,
  format: "iife",
  target: ["es2020"],
  nodePaths: [path.join(__dirname, "node_modules")],
  outfile: path.join(ROOT, "hangar/app.bundle.js"),
  minify: false, // keep the artifact auditable
  legalComments: "inline",
  logLevel: "info",
  metafile: true,
});

const meta = result.metafile;
console.log(`bundle bytes: ${meta.outputs[Object.keys(meta.outputs)[0]].bytes}`);


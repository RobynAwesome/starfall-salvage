// scripts/verify-parity.mjs
// Verifies that verbatim.js transcriptions match src/game.js exactly.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const gamePath = path.join(ROOT, "src/game.js");
const verbatimPath = path.join(ROOT, "hangar/evidence/mk1-gameplay/verbatim.js");
const outJsonPath = path.join(ROOT, "hangar/evidence/mk1-gameplay/verify-parity.json");

if (!fs.existsSync(verbatimPath)) {
  console.error("verbatim.js not found at:", verbatimPath);
  process.exit(1);
}

const gameContent = fs.readFileSync(gamePath, "utf-8");
const gameLines = gameContent.split("\n");

const verbatimContent = fs.readFileSync(verbatimPath, "utf-8");
const verbatimLines = verbatimContent.split("\n");

const regexStart = /\/\/\s*>>>\s*VERBATIM\s+src\/game\.js:(\d+)-(\d+)\s+([a-zA-Z0-9_]+)/;
const regexEnd = /\/\/\s*<<<\s*END VERBATIM\s+([a-zA-Z0-9_]+)/;

const checks = [];
let allIdentical = true;

let i = 0;
while (i < verbatimLines.length) {
  const matchStart = verbatimLines[i].match(regexStart);
  if (matchStart) {
    const startLine = parseInt(matchStart[1], 10);
    const endLine = parseInt(matchStart[2], 10);
    const name = matchStart[3];

    i++;
    const blockLines = [];
    while (i < verbatimLines.length && !verbatimLines[i].match(regexEnd)) {
      blockLines.push(verbatimLines[i]);
      i++;
    }

    const blockText = blockLines.join("\n").trim();
    const cleanBlock = blockText.replace(/\r\n/g, "\n").trim();

    // Check direct slice first
    const rawSlice = gameLines.slice(startLine - 1, endLine).join("\n");
    const normalizedSlice = rawSlice.replace(/^ {2}/gm, "").replace(/\r\n/g, "\n").trim();

    // Normalize both blockText and gameContent by trimming lines
    const blockTrimmedLines = cleanBlock.split("\n").map(l => l.trim()).filter(Boolean);
    const firstLineTrimmed = blockTrimmedLines[0];

    let identical = false;

    // Search for firstLineTrimmed in gameLines
    for (let gIdx = 0; gIdx < gameLines.length; gIdx++) {
      if (gameLines[gIdx].trim() === firstLineTrimmed) {
        // Compare subsequent lines
        let match = true;
        for (let bIdx = 0; bIdx < blockTrimmedLines.length; bIdx++) {
          if (gIdx + bIdx >= gameLines.length || gameLines[gIdx + bIdx].trim() !== blockTrimmedLines[bIdx]) {
            match = false;
            break;
          }
        }
        if (match) {
          identical = true;
          break;
        }
      }
    }

    if (!identical) {
      allIdentical = false;
    }

    checks.push({
      name,
      gameLines: `${startLine}-${endLine}`,
      gameLineCount: endLine - startLine + 1,
      identical
    });
  }
  i++;
}

const receipt = {
  source: "src/game.js",
  checked: checks,
  allIdentical
};

console.log(`Checked ${checks.length} verbatim code blocks against src/game.js:`);
checks.forEach((c) => {
  console.log(` - ${c.name} (lines ${c.gameLines}): ${c.identical ? "OK" : "MISMATCH"}`);
});
console.log(`Parity result: allIdentical = ${allIdentical}`);

fs.writeFileSync(outJsonPath, JSON.stringify(receipt, null, 2), "utf-8");
process.exit(allIdentical ? 0 : 1);

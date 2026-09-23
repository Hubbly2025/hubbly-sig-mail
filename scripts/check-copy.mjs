// Fails if customer-facing source mentions an email vendor or uses "AI" in copy.
// Run: npm run check:copy (also run it in CI).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components", "lib"];
const BANNED = [/mailin/i, /plusvibe/i, /\bAI\b/];
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(name)) {
      readFileSync(p, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const re of BANNED) if (re.test(line)) hits.push(`${p}:${i + 1}: ${line.trim()}`);
        });
    }
  }
}

ROOTS.forEach(walk);
if (hits.length) {
  console.error("Banned terms found in customer-facing source:\n" + hits.join("\n"));
  process.exit(1);
}
console.log("check:copy passed — no vendor names or \"AI\" in source.");

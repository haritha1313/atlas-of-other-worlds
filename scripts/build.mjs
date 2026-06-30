#!/usr/bin/env node
// Fetch the latest confirmed-exoplanet table from the NASA Exoplanet Archive,
// compress it into a compact array, and splice it into scripts/template.html
// to produce a fully self-contained index.html at the project root.
//
// Usage: node scripts/build.mjs
// Requires Node 18+ (uses the built-in fetch).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const QUERY =
  "SELECT pl_name,hostname,disc_year,discoverymethod,sy_dist,pl_rade," +
  "pl_bmasse,pl_orbper,pl_eqt,st_teff,sy_snum,sy_pnum FROM pscomppars";
const ENDPOINT =
  "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=" +
  encodeURIComponent(QUERY) + "&format=csv";

const PC_TO_LY = 3.2615638;

// Minimal CSV parser that understands quoted fields.
function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (ch === "\r") { /* skip */ }
    else cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const num = (v) => { if (v === "" || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const sig = (v, p = 4) => (v == null ? null : parseFloat(v.toPrecision(p)));

async function main() {
  console.log("Fetching from the NASA Exoplanet Archive…");
  const res = await fetch(ENDPOINT, { headers: { Accept: "text/csv" } });
  if (!res.ok) throw new Error(`Archive responded ${res.status} ${res.statusText}`);
  const csv = await res.text();

  const rows = parseCSV(csv);
  const header = rows.shift();
  const idx = {};
  header.forEach((h, i) => (idx[h] = i));

  const methods = [];
  const methodIdx = (m) => { let i = methods.indexOf(m); if (i < 0) { methods.push(m); i = methods.length - 1; } return i; };

  const out = [];
  for (const r of rows) {
    if (!r[idx.pl_name]) continue;
    const distPc = num(r[idx.sy_dist]);
    const eqt = num(r[idx.pl_eqt]);
    const teff = num(r[idx.st_teff]);
    out.push([
      r[idx.pl_name],
      r[idx.hostname],
      num(r[idx.disc_year]),
      methodIdx(r[idx.discoverymethod]),
      distPc == null ? null : sig(distPc * PC_TO_LY, 4),
      sig(num(r[idx.pl_rade]), 4),
      sig(num(r[idx.pl_bmasse]), 4),
      sig(num(r[idx.pl_orbper]), 5),
      eqt == null ? null : Math.round(eqt),
      teff == null ? null : Math.round(teff),
      num(r[idx.sy_snum]),
      num(r[idx.sy_pnum]),
    ]);
  }
  out.sort((a, b) => (a[2] || 0) - (b[2] || 0));

  const dataJs =
    "const METHODS=" + JSON.stringify(methods) + ";\n" +
    "const PLANETS=" + JSON.stringify(out) + ";\n";

  const template = readFileSync(join(__dirname, "template.html"), "utf8");
  if (!template.includes("// __PLANET_DATA__"))
    throw new Error("template.html is missing the // __PLANET_DATA__ marker");
  const html = template.replace("// __PLANET_DATA__", dataJs);
  writeFileSync(join(ROOT, "index.html"), html);

  const years = out.map((p) => p[2]).filter(Boolean);
  console.log(
    `Built index.html: ${out.length.toLocaleString()} planets, ` +
    `${Math.min(...years)}–${Math.max(...years)}, ` +
    `${(Buffer.byteLength(html) / 1024).toFixed(0)} KB.`
  );
}

main().catch((err) => { console.error("Build failed:", err.message); process.exit(1); });

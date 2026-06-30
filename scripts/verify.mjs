#!/usr/bin/env node
// Headless smoke test. There is no browser here, so we stub a Canvas 2D
// context and a minimal DOM, then run the app's init plus a few interactions
// and assert it produced sensible output. Exits non-zero on any failure.
//
// Usage: node scripts/verify.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, "..", "index.html"), "utf8");
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function fakeCtx() {
  return new Proxy({}, {
    get(_t, p) {
      if (p === "canvas") return { clientWidth: 700 };
      if (p === "createLinearGradient" || p === "createRadialGradient") return () => ({ addColorStop() {} });
      if (p === "measureText") return () => ({ width: 10 });
      return () => {};
    },
    set() { return true; },
  });
}
function el(id) {
  const L = {};
  return {
    id, value: "", textContent: "", innerHTML: "", style: {}, dataset: {}, className: "",
    offsetHeight: ("" + id).includes("timeline") ? 150 : 48,
    clientWidth: id === "portrait" ? 320 : 700, width: 0, height: 0,
    classList: { add() {}, remove() {}, toggle() {} },
    _L: L, addEventListener(e, f) { L[e] = f; }, appendChild() {},
    querySelectorAll() { return []; }, getContext() { return fakeCtx(); },
  };
}
const els = {};
globalThis.document = {
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  createElement(t) { return el("_" + t); },
  querySelector(sel) { return el(sel.includes("timeline") ? "timeline" : "controls"); },
  querySelectorAll() { return []; },
  body: el("body"),
};
globalThis.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; } };
globalThis.window = { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2, addEventListener() {}, matchMedia() { return { matches: false }; } };
globalThis.requestAnimationFrame = (f) => { globalThis.__raf = f; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const assert = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exit(1); } };

try {
  eval(js);
  globalThis.__raf(1000);
  const shown = Number(els.shownCount.textContent.replace(/[^0-9]/g, ""));
  assert(shown > 1000, `expected many worlds shown, got ${shown}`);
  assert(/svg/.test(els.play.innerHTML), "play icon not rendered");
  assert(globalThis.document.body.dataset.theme === "dark", "theme should initialize to dark");

  // interactions
  els.theme._L.click({});                         // toggle theme
  globalThis.__raf(1001);
  assert(globalThis.document.body.dataset.theme === "light", "theme did not switch to light");
  assert(globalThis.localStorage.getItem("atlas-theme") === "light", "theme not persisted");

  els.surprise._L.click({});                      // open a random world
  globalThis.__raf(1002);
  assert(/<h3>/.test(els.detailBody.innerHTML), "detail card did not render");

  els.tHab._L.click({ target: els.tHab });        // habitable filter
  globalThis.__raf(1003);

  els.theme._L.click({});                         // toggle back
  globalThis.__raf(1004);
  assert(globalThis.document.body.dataset.theme === "dark", "theme did not switch back to dark");

  console.log(`OK — ${shown.toLocaleString()} worlds render, interactions and theme toggle work.`);
} catch (err) {
  console.error("ERROR:", err.message);
  console.error(err.stack.split("\n").slice(0, 4).join("\n"));
  process.exit(1);
}

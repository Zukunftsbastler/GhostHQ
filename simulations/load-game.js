// Lädt die DOM-freien Spielmodule (rng/data/engine) in einen frischen
// vm-Kontext – identisch zur Browser-Ladereihenfolge, ohne DOM-APIs.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadGame() {
  const ctx = { console };
  vm.createContext(ctx);
  for (const f of ["rng.js", "data.js", "engine.js"]) {
    const src = fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
    vm.runInContext(src, ctx, { filename: f });
  }
  return vm.runInContext("({ Engine, DATA })", ctx);
}

module.exports = { loadGame };

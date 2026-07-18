// Deterministischer Zufallsgenerator (mulberry32).
// Der Zustand liegt im Spielstand (S.rngState), damit Läufe mit gleichem Seed
// exakt reproduzierbar sind – auch nach Speichern/Laden.
"use strict";

const RNG = {
  seedFrom(str) {
    let h = 1779033703 ^ String(str).length;
    for (let i = 0; i < String(str).length; i++) {
      h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  },

  // liefert Zahl in [0,1) und den Folgezustand
  step(state) {
    let t = (state + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return { value: ((r ^ (r >>> 14)) >>> 0) / 4294967296, state: t };
  },
};

// Bequeme Wrapper, die direkt auf einem Spielstand-Objekt mit .rngState arbeiten
function rnd(S) {
  const { value, state } = RNG.step(S.rngState);
  S.rngState = state;
  return value;
}
function rndInt(S, min, max) { // inklusive
  return min + Math.floor(rnd(S) * (max - min + 1));
}
function rndPick(S, arr) {
  return arr[Math.floor(rnd(S) * arr.length)];
}
function rndChance(S, p) {
  return rnd(S) < p;
}
function rndWeighted(S, entries) { // entries: [{item, weight}]
  const total = entries.reduce((a, e) => a + e.weight, 0);
  let roll = rnd(S) * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.item;
  }
  return entries[entries.length - 1].item;
}

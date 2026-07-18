// Batch-Simulation: fährt den Agenten über viele Seeds und aggregiert
// Balancing-Metriken. Parallelisierung über worker_threads, bewusst auf
// max. 6 Worker gedeckelt (Ziel-Hardware: Apple M3 Pro, 32 GB) – Worker
// aggregieren lokal und senden nur kompakte Summen zurück (kein OOM-Risiko).
//
// Aufruf: node simulations/batch.js [--runs 1000] [--days 100] [--tag baseline]
"use strict";
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const path = require("path");

const MAX_WORKERS = 6; // Hardware-Deckel laut Auftrag
const BANKRUPT_AT = -500; // "effektiv bankrott" – das Spiel selbst kennt keinen Bankrott-Zustand

// ---------------------------------------------------------------- Ein Lauf
function newRecord() {
  return {
    days: 0, reason: "day100", won: false,
    money: 0, rep: 0, schleier: 0,
    moneyAt: {}, // Tag -> Kontostand (10/25/50/75)
    missions: { started: 0, success: 0, fail: 0, abort: 0, clean: 0, locked: 0, invasions: 0, anomalies: 0, variants: 0 },
    bucketS: new Array(10).fill(0), bucketF: new Array(10).fill(0),
    chanceSum: 0, chanceN: 0,
    firstBuy: {}, purchases: 0, refills: 0, hires: 0, studies: 0,
    wards: 0, mods: 0, grids: 0, books: 0, events: 0, injuries: 0, restDays: 0,
    methods: {}, rivalTaken: 0, unlocks: 0, invasionsSeen: 0,
  };
}

function runOne(G, agent, seed, maxDays) {
  const { Engine } = G;
  const S = Engine.newGame(String(seed));
  const rec = newRecord();
  for (let d = 0; d < maxDays; d++) {
    agent.playDay(S, rec);
    if ([10, 25, 50, 75].includes(S.day)) rec.moneyAt[S.day] = S.money;
    if (S.flags.lost) { rec.reason = "veil"; break; }
    if (S.money < BANKRUPT_AT) { rec.reason = "bankrott"; break; }
    if (S.day >= maxDays) break;
    Engine.nextDay(S);
    if (S.contracts.some((c) => c.invasion)) rec.invasionsSeen++;
  }
  rec.days = S.day;
  rec.won = S.flags.won;
  rec.money = Math.round(S.money);
  rec.rep = S.rep;
  rec.schleier = S.schleier;
  rec.books = S.library.length;
  rec.rivalTaken = S.rival.taken;
  rec.unlocks = Object.values(S.grimoire).reduce((a, g) => a + g.unlocked.length, 0);
  rec.roomLevels = { ...S.hq };
  return rec;
}

// --------------------------------------------------------------- Aggregation
function newAgg() {
  return {
    runs: 0, reasons: {}, wins: 0, daysSum: 0, daysList: [],
    moneyFinal: [], repSum: 0, schleierSum: 0,
    moneyAtSum: { 10: 0, 25: 0, 50: 0, 75: 0 }, moneyAtN: { 10: 0, 25: 0, 50: 0, 75: 0 },
    missions: { started: 0, success: 0, fail: 0, abort: 0, clean: 0, locked: 0, invasions: 0, anomalies: 0, variants: 0 },
    bucketS: new Array(10).fill(0), bucketF: new Array(10).fill(0),
    chanceSum: 0, chanceN: 0,
    firstBuyCount: {}, firstBuyDaySum: {},
    roomFinalSum: {}, methods: {},
    counters: { refills: 0, hires: 0, studies: 0, wards: 0, mods: 0, grids: 0, books: 0, events: 0, injuries: 0, restDays: 0, rivalTaken: 0, unlocks: 0, invasionsSeen: 0 },
  };
}

function addRec(agg, rec) {
  agg.runs++;
  agg.reasons[rec.reason] = (agg.reasons[rec.reason] || 0) + 1;
  if (rec.won) agg.wins++;
  agg.daysSum += rec.days;
  agg.daysList.push(rec.days);
  agg.moneyFinal.push(rec.money);
  agg.repSum += rec.rep;
  agg.schleierSum += rec.schleier;
  for (const d of [10, 25, 50, 75]) {
    if (rec.moneyAt[d] !== undefined) { agg.moneyAtSum[d] += rec.moneyAt[d]; agg.moneyAtN[d]++; }
  }
  for (const k of Object.keys(agg.missions)) agg.missions[k] += rec.missions[k];
  for (let i = 0; i < 10; i++) { agg.bucketS[i] += rec.bucketS[i]; agg.bucketF[i] += rec.bucketF[i]; }
  agg.chanceSum += rec.chanceSum; agg.chanceN += rec.chanceN;
  for (const [id, day] of Object.entries(rec.firstBuy)) {
    agg.firstBuyCount[id] = (agg.firstBuyCount[id] || 0) + 1;
    agg.firstBuyDaySum[id] = (agg.firstBuyDaySum[id] || 0) + day;
  }
  for (const [room, lvl] of Object.entries(rec.roomLevels || {})) {
    agg.roomFinalSum[room] = (agg.roomFinalSum[room] || 0) + lvl;
  }
  for (const [m, n] of Object.entries(rec.methods)) agg.methods[m] = (agg.methods[m] || 0) + n;
  for (const k of Object.keys(agg.counters)) agg.counters[k] += rec[k] || 0;
}

function mergeAgg(a, b) {
  a.runs += b.runs;
  for (const [k, v] of Object.entries(b.reasons)) a.reasons[k] = (a.reasons[k] || 0) + v;
  a.wins += b.wins; a.daysSum += b.daysSum;
  a.daysList.push(...b.daysList);
  a.moneyFinal.push(...b.moneyFinal);
  a.repSum += b.repSum; a.schleierSum += b.schleierSum;
  for (const d of [10, 25, 50, 75]) { a.moneyAtSum[d] += b.moneyAtSum[d]; a.moneyAtN[d] += b.moneyAtN[d]; }
  for (const k of Object.keys(a.missions)) a.missions[k] += b.missions[k];
  for (let i = 0; i < 10; i++) { a.bucketS[i] += b.bucketS[i]; a.bucketF[i] += b.bucketF[i]; }
  a.chanceSum += b.chanceSum; a.chanceN += b.chanceN;
  for (const [k, v] of Object.entries(b.firstBuyCount)) a.firstBuyCount[k] = (a.firstBuyCount[k] || 0) + v;
  for (const [k, v] of Object.entries(b.firstBuyDaySum)) a.firstBuyDaySum[k] = (a.firstBuyDaySum[k] || 0) + v;
  for (const [k, v] of Object.entries(b.roomFinalSum)) a.roomFinalSum[k] = (a.roomFinalSum[k] || 0) + v;
  for (const [k, v] of Object.entries(b.methods)) a.methods[k] = (a.methods[k] || 0) + v;
  for (const k of Object.keys(a.counters)) a.counters[k] += b.counters[k];
}

// ------------------------------------------------------------------- Worker
if (!isMainThread) {
  const { loadGame } = require("./load-game.js");
  const { createAgent } = require("./agent.js");
  const G = loadGame(); // ein Kontext pro Worker, wird über alle Läufe wiederverwendet
  const agent = createAgent(G);
  const agg = newAgg();
  for (let seed = workerData.start; seed < workerData.start + workerData.count; seed++) {
    addRec(agg, runOne(G, agent, "sim-" + seed, workerData.days));
  }
  parentPort.postMessage(agg);
  return;
}

// --------------------------------------------------------------- Hauptthread
function pct(list, p) {
  const s = [...list].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name, def) => {
    const i = args.indexOf("--" + name);
    return i >= 0 ? args[i + 1] : def;
  };
  const runs = parseInt(getArg("runs", "1000"), 10);
  const days = parseInt(getArg("days", "100"), 10);
  const tag = getArg("tag", "run");
  const nWorkers = Math.min(MAX_WORKERS, parseInt(getArg("workers", String(MAX_WORKERS)), 10));

  const t0 = Date.now();
  const chunk = Math.ceil(runs / nWorkers);
  const jobs = [];
  for (let w = 0; w < nWorkers; w++) {
    const start = w * chunk;
    const count = Math.min(chunk, runs - start);
    if (count <= 0) break;
    jobs.push(new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: { start, count, days } });
      worker.once("message", resolve);
      worker.once("error", reject);
    }));
  }
  const parts = await Promise.all(jobs);
  const agg = parts[0];
  for (const p of parts.slice(1)) mergeAgg(agg, p);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  // ---------------------------------------------------------------- Ausgabe
  const M = agg.missions;
  const out = {
    tag, runs: agg.runs, days, seconds: +secs, workers: jobs.length,
    survival: {
      day100: (agg.reasons["day100"] || 0) / agg.runs,
      veil: (agg.reasons["veil"] || 0) / agg.runs,
      bankrott: (agg.reasons["bankrott"] || 0) / agg.runs,
      avgDays: agg.daysSum / agg.runs,
      p10Days: pct(agg.daysList, 0.10), p50Days: pct(agg.daysList, 0.50),
      legendWins: agg.wins / agg.runs,
    },
    economy: {
      moneyFinalP10: pct(agg.moneyFinal, 0.10), moneyFinalP50: pct(agg.moneyFinal, 0.50), moneyFinalP90: pct(agg.moneyFinal, 0.90),
      moneyAvgAt: Object.fromEntries([10, 25, 50, 75].map((d) => [d, agg.moneyAtN[d] ? Math.round(agg.moneyAtSum[d] / agg.moneyAtN[d]) : null])),
      avgRep: +(agg.repSum / agg.runs).toFixed(1),
      avgSchleier: +(agg.schleierSum / agg.runs).toFixed(1),
    },
    missions: {
      perRun: +(M.started / agg.runs).toFixed(1),
      successRate: +(M.success / Math.max(1, M.success + M.fail)).toFixed(3),
      abortRate: +(M.abort / Math.max(1, M.started)).toFixed(3),
      cleanRate: +(M.clean / Math.max(1, M.success)).toFixed(3),
      avgExecChance: +(agg.chanceSum / Math.max(1, agg.chanceN)).toFixed(3),
      lockedAborts: M.locked, invasions: M.invasions, anomalies: M.anomalies, variantMissions: M.variants,
    },
    successByDecade: agg.bucketS.map((s, i) => {
      const f = agg.bucketF[i];
      return s + f ? +(s / (s + f)).toFixed(2) : null;
    }),
    purchases: Object.fromEntries(Object.entries(agg.firstBuyCount)
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => [id, { rate: +(n / agg.runs).toFixed(2), avgDay: +(agg.firstBuyDaySum[id] / n).toFixed(1) }])),
    roomAvgFinal: Object.fromEntries(Object.entries(agg.roomFinalSum).map(([r, v]) => [r, +(v / agg.runs).toFixed(2)])),
    methodsPlaced: agg.methods,
    counters: agg.counters,
  };

  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, tag + ".json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  console.error(`\n[${tag}] ${agg.runs} Läufe in ${secs}s mit ${jobs.length} Workern → simulations/out/${tag}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });

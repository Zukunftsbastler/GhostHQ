// GhostHQ Engine – Sim-Loop (Wirtschaft, Stadt, Wetter) und Encounter-Loop
// (Diagnose mit Fehlerkennungs-Risiko, Vorbereitung, Ausführung, Nachwirkung)
// sowie das Grimoire (Wissenskomponenten pro Geistertyp).
// Bewusst DOM-frei: Der komplette Spielzustand liegt in einem einzigen
// serialisierbaren Objekt S; UI und Grafik rufen nur Funktionen von hier auf.
"use strict";

const Engine = {};
Engine.SAVE_VERSION = 3;
// Zentrale Balancing-Parameter (siehe DATA.BALANCE in data.js)
const BAL = () => DATA.BALANCE;

// ------------------------------------------------------------- Hilfsfunktionen
Engine.eq = (id) => DATA.EQUIPMENT.find((e) => e.id === id);
Engine.ghost = (id) =>
  id.startsWith("anomalie:") ? Engine.anomalyFromId(id) : DATA.GHOSTS.find((g) => g.id === id);
Engine.isAnomaly = (id) => id.startsWith("anomalie:");

// Prozedurale Endgame-Anomalien: Die Entität wird deterministisch aus ihrer
// ID rekonstruiert (reine Funktion, eigener Zufallsstrom) – nichts davon
// steht im Kodex oder Grimoire, es zählt nur die Deduktion Spur → Konter.
Engine._anomCache = {};
Engine.anomalyFromId = function (id) {
  if (Engine._anomCache[id]) return Engine._anomCache[id];
  const danger = parseInt(id.split(":")[2], 10) || 7;
  let st = RNG.seedFrom(id);
  const pull = () => { const r = RNG.step(st); st = r.state; return r.value; };
  const pick = (arr) => arr[Math.floor(pull() * arr.length)];
  const name = `${pick(DATA.ANOMALY_PREFIX)} ${pick(DATA.ANOMALY_NOUN)}`;
  const pool = Object.keys(DATA.TRAITS).filter((t) => DATA.TRAITS[t].counter);
  const traits = [];
  const n = danger >= 9 ? 4 : 3;
  while (traits.length < n && pool.length) {
    const t = pick(pool);
    if (!traits.includes(t)) traits.push(t);
  }
  const g = {
    id, name, factionId: "anomalien", rank: "anomalie", traits,
    dangerRating: danger,
    loot: [{ type: "essence", name: "Schleieressenz-Fragment", rarity: "epic" }],
    notes: "Nicht dokumentiert. Ein Riss, der sich Eigenschaften zusammenstiehlt.",
  };
  Engine._anomCache[id] = g;
  return g;
};
Engine.loc = (id) => DATA.LOCATIONS.find((l) => l.id === id);
Engine.hunter = (S, id) => S.hunters.find((h) => h.id === id);
Engine.district = (S, id) => S.city.districts.find((d) => d.id === id);
Engine.districtOfLoc = (S, locId) => {
  const loc = Engine.loc(locId);
  if (loc && loc.special === "hq") return Engine.district(S, S.city.hq.districtId);
  const p = S.city.places.find((x) => x.locId === locId);
  return Engine.district(S, p.districtId);
};

Engine.log = function (S, text, kind = "info") {
  S.log.unshift({ day: S.day, text, kind });
  if (S.log.length > 150) S.log.pop();
};

// --------------------------------------------------------- Varianten & Wissen
Engine.tierDef = (tier) => DATA.VARIANT_TIERS[tier] || DATA.VARIANT_TIERS[0];
Engine.ghostDisplayName = (entry) =>
  Engine.tierDef(entry.tier).prefix + Engine.ghost(entry.id).name;
Engine.effectiveTraits = (entry) =>
  [...Engine.ghost(entry.id).traits, ...(entry.extra || [])];
Engine.entryDanger = (entry) =>
  Engine.ghost(entry.id).dangerRating + Engine.tierDef(entry.tier).dangerMod;
Engine.contractDanger = (c) => c.ghosts.reduce((a, e) => a + Engine.entryDanger(e), 0);

Engine.grim = function (S, ghostId) {
  if (!S.grimoire[ghostId]) S.grimoire[ghostId] = { specimens: 0, points: 0, unlocked: [] };
  return S.grimoire[ghostId];
};
Engine.know = function (S, ghostId, compId) {
  const g = S.grimoire[ghostId];
  return !!(g && g.unlocked.includes(compId));
};
// Bis zu welcher Varianten-Stufe ist dieser Typ diagnostizier-/bannbar?
Engine.allowedTier = function (S, ghostId) {
  return 1 + (Engine.know(S, ghostId, "varianten1") ? 1 : 0)
           + (Engine.know(S, ghostId, "varianten2") ? 1 : 0);
};
Engine.nextKnowledge = function (S, ghostId) {
  const g = Engine.grim(S, ghostId);
  return DATA.KNOWLEDGE.find((k) => !g.unlocked.includes(k.id));
};

// Studium im Archiv: verbraucht 1 Essenzprobe, 1× pro Tag, Forschung zählt.
Engine.canStudy = function (S, ghostId) {
  if (S.hq.archiv < 1) return { ok: false, why: "Ein Archiv wird benötigt." };
  if (S.flags.studiedDay === S.day) return { ok: false, why: "Heute wurde bereits studiert." };
  const g = Engine.grim(S, ghostId);
  if (g.specimens < 1) return { ok: false, why: "Keine Essenzprobe vorhanden." };
  if (!Engine.nextKnowledge(S, ghostId)) return { ok: false, why: "Alles Wissen erschlossen." };
  const researcher = Engine.bestResearcher(S);
  if (!researcher) return { ok: false, why: "Niemand ist einsatzbereit." };
  return { ok: true, researcher, points: 2 + Engine.effSkill(researcher, "forschung") };
};
Engine.bestResearcher = function (S) {
  const avail = S.hunters.filter(Engine.hunterAvailable);
  if (!avail.length) return null;
  return avail.reduce((a, b) => (Engine.effSkill(b, "forschung") > Engine.effSkill(a, "forschung") ? b : a));
};
Engine.study = function (S, ghostId) {
  const chk = Engine.canStudy(S, ghostId);
  if (!chk.ok) return false;
  const g = Engine.grim(S, ghostId);
  const ghost = Engine.ghost(ghostId);
  g.specimens--;
  g.points += chk.points;
  chk.researcher.stress = Math.min(100, chk.researcher.stress + 5);
  S.flags.studiedDay = S.day;
  Engine.log(S, `${chk.researcher.name} studiert eine Essenzprobe von ${ghost.name} (+${chk.points} Erkenntnis).`);
  // Komponenten schalten sequentiell frei, sobald die Schwelle erreicht ist
  let k;
  while ((k = Engine.nextKnowledge(S, ghostId)) && g.points >= k.cost) {
    g.unlocked.push(k.id);
    Engine.log(S, `Grimoire · ${ghost.name} · „${k.name}“: ${k.lore.replace("{name}", ghost.name)}`, "good");
  }
  return true;
};

// ------------------------------------------------------------------ Neustart
Engine.newGame = function (seedText, opts = {}) {
  const seed = seedText && String(seedText).trim() !== "" ? String(seedText).trim() : String(Date.now() % 100000);
  const S = {
    version: Engine.SAVE_VERSION,
    seed, rngState: RNG.seedFrom(seed),
    day: 1, money: BAL().start.money, rep: BAL().start.rep, schleier: BAL().start.schleier,
    weather: "klar",
    city: null,
    hq: { garage: 1, werkstatt: 0, archiv: 0, labor: 0, unterkunft: 0, kapelle: 0 },
    hunters: [], candidates: [], nextHunterId: 1,
    inventory: {}, stash: [],
    mods: {},          // permanente Kapazitäts-Mods aus dem Labor
    library: [],       // gekaufte Fachbücher (Hinweis-Framework)
    legacyPerks: [],   // Vermächtnisse pensionierter Jäger:innen
    grids: {},         // districtId -> true (automatische Sensornetze)
    contracts: [], nextContractId: 1,
    mission: null,
    pendingEvent: null,
    rival: null,
    grimoire: {},
    log: [],
    codexSeen: {},
    stats: { banished: 0, failed: 0, cleanStreak: 0 },
    flags: {
      legendOffered: false, won: false, lost: false,
      lastGrantDay: -99, lastLaborGrant: 0, studiedDay: 0,
      tutorialActive: opts.tutorial !== false,
    },
  };
  S.rival = { name: rndPick(S, DATA.RIVAL_NAMES), taken: 0 };
  Engine.generateCity(S);
  S.weather = Engine.rollWeather(S);
  S.inventory["emf1"] = { charges: null };
  S.inventory["salz"] = { charges: 5 };
  S.inventory["erdung"] = { charges: null };
  Engine.addHunter(S, "techniker");
  Engine.addHunter(S, "okkultist");
  Engine.refreshCandidates(S);
  Engine.generateContracts(S);
  Engine.log(S, "Die Garage ist bezogen. GhostHQ nimmt den Betrieb auf. (Seed: " + seed + ")", "good");
  return S;
};

// ------------------------------------------------------------ Stadtgenerierung
// Die Stadt ist Teil des Spielzustands: Bezirke (mit lokalem Schleier), Fluss,
// HQ-Standort und Ortspositionen entstehen deterministisch aus dem Seed.
Engine.generateCity = function (S) {
  const W = 960, H = 600, cols = 3, rows = 2;
  const districts = [];
  const used = [];
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      let name;
      do {
        const pre = rndPick(S, DATA.DISTRICT_PREFIX);
        let stem = rndPick(S, DATA.DISTRICT_STEM);
        if (pre.endsWith("-") || pre.endsWith(" ")) stem = stem[0].toUpperCase() + stem.slice(1);
        name = pre + stem;
      } while (used.includes(name));
      used.push(name);
      districts.push({
        id: "d" + (r * cols + cIdx), name,
        x: cIdx * (W / cols), y: r * (H / rows), w: W / cols, h: H / rows,
        veil: rndInt(S, 5, 25),
      });
    }
  }
  // Fluss: leicht mäandernder Zug quer durch die Stadt
  const river = [];
  let ry = rndInt(S, 200, 400);
  for (let x = 0; x <= W; x += 120) {
    river.push({ x, y: ry });
    ry = Math.max(80, Math.min(H - 80, ry + rndInt(S, -70, 70)));
  }
  // HQ in einem zufälligen Bezirk
  const hqD = districts[rndInt(S, 0, districts.length - 1)];
  const hq = { x: hqD.x + hqD.w / 2 + rndInt(S, -40, 40), y: hqD.y + hqD.h / 2 + rndInt(S, -30, 30), districtId: hqD.id };
  // Orte reihum auf die Bezirke verteilen (2 pro Bezirk), Position mit Jitter
  const locs = DATA.LOCATIONS.filter((l) => !l.special);
  // deterministisch mischen
  for (let i = locs.length - 1; i > 0; i--) {
    const j = rndInt(S, 0, i);
    [locs[i], locs[j]] = [locs[j], locs[i]];
  }
  const places = locs.map((loc, i) => {
    const d = districts[i % districts.length];
    let x, y, tries = 0;
    do {
      x = d.x + 50 + rnd(S) * (d.w - 100);
      y = d.y + 55 + rnd(S) * (d.h - 110);
      tries++;
    } while (tries < 10 && Math.hypot(x - hq.x, y - hq.y) < 70);
    return { locId: loc.id, districtId: d.id, x: Math.round(x), y: Math.round(y) };
  });
  S.city = { districts, river, hq, places };
};

// ------------------------------------------------------------------- Wetter
Engine.rollWeather = function (S) {
  return rndWeighted(S, Object.entries(DATA.WEATHER).map(([id, w]) => ({ item: id, weight: w.weight })));
};

// -------------------------------------------------------------------- Anfahrt
Engine.travelInfo = function (S, locId) {
  const loc = Engine.loc(locId);
  if (loc && loc.special === "hq") return { dist: 0, km: 0, cost: 0, far: false };
  const p = S.city.places.find((x) => x.locId === locId);
  const dist = Math.hypot(p.x - S.city.hq.x, p.y - S.city.hq.y);
  let cost = Math.round(BAL().travel.base + dist / BAL().travel.perDist);
  if (S.weather === "regen") cost += BAL().travel.rainSurcharge;
  if (S.weather === "sturm") cost *= 2;
  return { dist, km: Math.round(dist / 40 * 10) / 10, cost, far: dist > 380 };
};

// Effektive Umwelt-Tags eines Ortes inkl. Wetter (Regen macht Außenorte
// feucht) und Schleier-Mutation: ab Bezirks-Schleier 80 verschiebt sich der
// Ort täglich – ein zusätzlicher, deterministisch gewürfelter Tag erscheint.
// (Eigener Zufallsstrom aus Seed+Tag+Ort; verbraucht keinen Spiel-RNG.)
Engine.effectiveEnv = function (S, loc) {
  const tags = [...loc.environmentTags];
  if (loc.outdoor && (S.weather === "regen") && !tags.includes("damp")) tags.push("damp");
  const d = Engine.districtOfLoc(S, loc.id);
  if (d && d.veil >= 80 && !loc.special) {
    const pool = ["sanctified", "damp", "eisen", "dunkel", "elektrifiziert"].filter((t) => !tags.includes(t));
    if (pool.length) {
      const r = RNG.step(RNG.seedFrom(S.seed + ":mut:" + S.day + ":" + loc.id)).value;
      tags.push(pool[Math.floor(r * pool.length)]);
    }
  }
  return tags;
};

Engine.addHunter = function (S, classId, name, quirkId) {
  const cls = DATA.CLASSES[classId];
  const used = S.hunters.map((h) => h.name).concat(S.candidates.map((c) => c.name));
  const free = DATA.HUNTER_NAMES.filter((n) => !used.includes(n));
  // Eigenheit: prozedural bei Rekrutierung (60 %); undefined = würfeln
  const quirk = quirkId !== undefined ? quirkId
    : (rndChance(S, 0.6) ? rndPick(S, DATA.QUIRKS).id : null);
  const h = {
    id: "h" + (S.nextHunterId++),
    name: name || (free.length ? rndPick(S, free) : "Aushilfe " + S.nextHunterId),
    class: classId,
    skills: { ...cls.skills },
    perks: [], quirk, stress: 0, injury: "none", injuryDays: 0,
    wage: cls.wage, xp: 0, level: 1,
  };
  S.hunters.push(h);
  return h;
};

Engine.refreshCandidates = function (S) {
  S.candidates = [];
  const classes = Object.keys(DATA.CLASSES);
  // Vermächtnisse pensionierter Veteran:innen prägen den Bewerbungspool
  const legacies = S.legacyPerks.slice(-2);
  for (let i = 0; i < 3; i++) {
    const classId = rndPick(S, classes);
    const cls = DATA.CLASSES[classId];
    const used = S.hunters.map((h) => h.name).concat(S.candidates.map((c) => c.name));
    const free = DATA.HUNTER_NAMES.filter((n) => !used.includes(n));
    S.candidates.push({
      name: free.length ? rndPick(S, free) : "Bewerber:in " + (i + 1),
      class: classId, wage: cls.wage + rndInt(S, -2, 4), fee: 100,
      quirk: rndChance(S, 0.6) ? rndPick(S, DATA.QUIRKS).id : null,
      legacies: legacies.map((l) => ({ ...l })),
    });
  }
};

// Ruhestand: Ab Stufe 5 kann eine Jäger:in in Ehren entlassen werden und
// vererbt ihr Können dauerhaft an künftige Bewerbungen (+1 Primärskill).
Engine.retire = function (S, hunterId) {
  const i = S.hunters.findIndex((h) => h.id === hunterId);
  if (i < 0 || S.hunters.length <= 1) return false;
  const h = S.hunters[i];
  if (h.level < 5) return false;
  const skill = DATA.CLASSES[h.class].primary;
  S.legacyPerks.push({ from: h.name, skill });
  S.hunters.splice(i, 1);
  Engine.log(S, `${h.name} geht in den Ruhestand. Das Vermächtnis (${DATA.SKILL_NAMES[skill]} +1) prägt künftige Bewerbungen.`, "good");
  Engine.refreshCandidates(S);
  return true;
};

// --------------------------------------------------------------- Wirtschaft
// Payout gemäß ECONOMY.md, ergänzt um RegionMod (lokaler Schleier des Bezirks
// = Gefahrenzulage) und den Varianten-Multiplikator.
Engine.payout = function (S, c) {
  const m = c.modifiers;
  const factor = 1 + 0.2 * c.threatEstimate
    + (m.includes("publicPlace") ? 0.15 : 0)
    + (m.includes("rush") ? 0.25 : 0)
    + (m.includes("multipleEntities") ? 0.3 : 0);
  const d = Engine.district(S, c.districtId);
  const regionMod = 1 + (d ? d.veil : 0) / 200;
  const tierMult = Math.max(...c.ghosts.map((e) => Engine.tierDef(e.tier).payMult));
  const repMod = 0.9 + 0.2 * (S.rep / 100);
  return Math.round(c.payoutBase * factor * regionMod * tierMult * repMod);
};

Engine.lootValue = function (S, item) {
  const base = DATA.FACTIONS[item.factionId] ? DATA.FACTIONS[item.factionId].lootBase : 30;
  let v = base * DATA.RARITY_MULT[item.rarity];
  if (item.type === "essence") {
    if (S.hq.labor >= 2) v *= 2; else if (S.hq.labor >= 1) v *= 1.5;
  }
  if (item.ghostId && Engine.know(S, item.ghostId, "essenz")) v *= 1.5;
  return Math.round(v);
};

Engine.maintenanceCost = function (S, usedEquipIds) {
  let sum = 0;
  for (const id of usedEquipIds) {
    const e = Engine.eq(id);
    if (e && e.charges === null) sum += e.price;
  }
  let cost = BAL().maintenanceRate * sum;
  if (S.hq.werkstatt >= 2) cost *= 0.5; else if (S.hq.werkstatt >= 1) cost *= 0.7;
  return Math.round(cost);
};

Engine.teamSize = function (S) { return 1 + S.hq.garage; };
Engine.equipmentTierCap = function (S) {
  return S.hq.werkstatt >= 2 ? 3 : (S.hq.werkstatt >= 1 ? 2 : 1);
};

// ---------------------------------------------------------------- Verträge
Engine.rankWeights = function (S) {
  if (S.schleier < 30) return [{ item: "minion", weight: 7 }, { item: "elite", weight: 3 }];
  if (S.schleier < 60) return [{ item: "minion", weight: 4 }, { item: "elite", weight: 5 }, { item: "boss", weight: 1 }];
  return [{ item: "minion", weight: 2 }, { item: "elite", weight: 5 }, { item: "boss", weight: 3 }];
};

Engine.pickGhostFor = function (S, loc, rank) {
  const pool = DATA.GHOSTS.filter((g) => g.rank === rank && g.rank !== "legend");
  const wetterBonus = (S.weather === "regen" || S.weather === "nebel") && loc.outdoor;
  const entries = pool.map((g) => {
    const bias = loc.factionBias.find((b) => b.factionId === g.factionId);
    let w = bias ? bias.weight * 2 : 0.5;
    if (wetterBonus && g.factionId === "naturgebunden") w *= 2; // Feuchte ↑ Naturgebundene
    return { item: g, weight: w };
  });
  return rndWeighted(S, entries);
};

// Varianten-Stufe hängt am lokalen Schleier des Bezirks (+ globalem Druck)
Engine.rollTier = function (S, district) {
  const T = BAL().tiers;
  const v = district.veil + S.schleier / 2;
  if (v >= T.t3.min && rndChance(S, (v - T.t3.off) / T.t3.div)) return 3;
  if (v >= T.t2.min && rndChance(S, (v - T.t2.off) / T.t2.div)) return 2;
  if (rndChance(S, v / T.t1.div)) return 1;
  return 0;
};

Engine.makeGhostEntry = function (S, ghost, tier) {
  const def = Engine.tierDef(tier);
  const extra = [];
  if (def.extraTraits > 0) {
    const pool = Object.keys(DATA.TRAITS).filter(
      (t) => DATA.TRAITS[t].counter && !ghost.traits.includes(t)
    );
    for (let i = 0; i < def.extraTraits && pool.length; i++) {
      const idx = rndInt(S, 0, pool.length - 1);
      extra.push(pool.splice(idx, 1)[0]);
    }
  }
  return { id: ghost.id, tier, extra };
};

Engine.makeContract = function (S, opts = {}) {
  const loc = opts.location || rndPick(S, DATA.LOCATIONS.filter((l) => !l.special));
  const district = Engine.districtOfLoc(S, loc.id);
  // Tutorial-Phase: nur einfache Einzel-Entitäten der Grundform, keine Eile.
  // Zusätzlich: höchstens EIN Konter darf zur aktuellen Ausrüstung fehlen –
  // so bleibt jeder Tutorial-Auftrag lösbar bzw. lehrt genau einen Einkauf.
  const gentle = opts.easy || S.flags.tutorialActive;
  let forced = opts.forceGhost;
  if (!forced && S.flags.tutorialActive) {
    const avail = Engine.ownedMethods(S);
    const pool = DATA.GHOSTS.filter((g) => {
      if (g.rank !== "minion") return false;
      const missing = g.traits.filter((t) => DATA.TRAITS[t].counter && !avail.has(DATA.TRAITS[t].counter));
      return missing.length <= 1;
    });
    if (pool.length) forced = rndPick(S, pool);
  }
  const rank = opts.rank || (S.flags.tutorialActive ? "minion" : rndWeighted(S, Engine.rankWeights(S)));
  const tier = gentle ? 0 : Engine.rollTier(S, district);
  const ghosts = [Engine.makeGhostEntry(S, forced || Engine.pickGhostFor(S, loc, rank), tier)];
  const modifiers = [];
  if (loc.publicPlace) modifiers.push("publicPlace");
  if (!gentle && rndChance(S, S.schleier / 200)) {
    const second = Engine.pickGhostFor(S, loc, "minion");
    if (second.id !== ghosts[0].id) {
      ghosts.push(Engine.makeGhostEntry(S, second, 0));
      modifiers.push("multipleEntities");
    }
  }
  if (!gentle && rndChance(S, S.schleier / 150)) modifiers.push("rush");
  if (!opts.easy && rndChance(S, 0.25)) modifiers.push("noCollateral");

  const danger = ghosts.reduce((a, e) => a + Engine.entryDanger(e), 0);
  const threatEstimate = Math.max(1, Math.min(12, danger + rndInt(S, -1, 1)));
  return {
    id: "c" + (S.nextContractId++),
    client: rndPick(S, DATA.CLIENTS),
    locationId: loc.id,
    districtId: district.id,
    ghosts,
    threatEstimate,
    payoutBase: BAL().payout.base + BAL().payout.perThreat * threatEstimate,
    modifiers,
    penalties: {
      collateralPerUnit: BAL().penalties.collateralBase + BAL().penalties.collateralPerThreat * threatEstimate,
      failure: BAL().penalties.failureBase + BAL().penalties.failurePerThreat * threatEstimate,
    },
    intel: [],
    guaranteed: !!opts.easy,
    expiresDay: S.day + (modifiers.includes("rush") ? 1 : 3),
    legend: !!opts.legend,
  };
};

Engine.generateContracts = function (S) {
  S.contracts = S.contracts.filter((c) => c.expiresDay >= S.day);
  const target = 2 + (S.hq.garage >= 2 ? 1 : 0) + (S.schleier > 60 ? 1 : 0);
  while (S.contracts.filter((c) => !c.legend).length < target) {
    S.contracts.push(Engine.makeContract(S));
  }
  if (!S.contracts.some((c) => c.guaranteed)) {
    // Kein Softlock: der Routineauftrag ist immer mit der VORHANDENEN
    // Ausrüstung konterbar und liegt in einem zum Geist passenden Habitat.
    const avail = Engine.ownedMethods(S);
    const counterable = DATA.GHOSTS.filter((g) => g.rank === "minion" &&
      g.traits.every((t) => !DATA.TRAITS[t].counter || avail.has(DATA.TRAITS[t].counter)));
    const ghost = counterable.length ? rndPick(S, counterable) : Engine.ghost("poltergeist_werkbank");
    let easyLocs = DATA.LOCATIONS.filter((l) => !l.publicPlace &&
      l.factionBias.some((b) => b.factionId === ghost.factionId));
    if (!easyLocs.length) easyLocs = DATA.LOCATIONS.filter((l) => !l.publicPlace);
    const c = Engine.makeContract(S, { easy: true, rank: "minion", location: rndPick(S, easyLocs), forceGhost: ghost });
    c.client = "Stammkundschaft";
    c.expiresDay = S.day + 2;
    S.contracts.push(c);
  }
  // Schleierbrüche: Sobald ein Geistertyp gemeistert ist (Grimoire 12/12),
  // reißen in Hochschleier-Bezirken prozedurale Anomalien auf – undokumentierte
  // Entitäten, gegen die nur die Deduktion Spur → Konter hilft.
  const mastered = Object.values(S.grimoire).some((g) => g.unlocked.length >= DATA.KNOWLEDGE.length);
  const hotDistrict = S.city.districts.filter((d) => d.veil >= BAL().anomaly.minVeil).sort((a, b) => b.veil - a.veil)[0];
  if (mastered && hotDistrict && !S.contracts.some((c) => Engine.isAnomaly(c.ghosts[0].id)) && rndChance(S, BAL().anomaly.chance)) {
    const place = S.city.places.find((p) => p.districtId === hotDistrict.id);
    const loc = Engine.loc(place.locId);
    const danger = 7 + Math.floor(hotDistrict.veil / 25) + Math.floor(S.schleier / 50);
    const anomId = `anomalie:${rndInt(S, 1000, 999999)}:${danger}`;
    const g = Engine.ghost(anomId);
    const threat = Math.max(1, Math.min(12, danger + rndInt(S, -1, 1)));
    S.contracts.push({
      id: "c" + (S.nextContractId++),
      client: "Der Rat der Stadt", locationId: loc.id, districtId: hotDistrict.id,
      ghosts: [{ id: anomId, tier: 0, extra: [] }],
      threatEstimate: threat, payoutBase: 80 + 34 * threat,
      modifiers: [], penalties: { collateralPerUnit: 40, failure: 30 + 10 * threat },
      intel: [], guaranteed: false, expiresDay: S.day + 3, legend: false,
    });
    Engine.log(S, `SCHLEIERBRUCH in ${hotDistrict.name}: Eine nicht dokumentierte Entität („${g.name}“) ist aufgetaucht. Der Kodex schweigt.`, "warn");
  }

  if (!S.flags.legendOffered && !S.flags.won && (S.rep >= 60 || S.schleier >= 75)) {
    // Der Schleierfürst erscheint im Bezirk mit dem höchsten lokalen Schleier
    const worst = [...S.city.districts].sort((a, b) => b.veil - a.veil)[0];
    const place = S.city.places.find((p) => p.districtId === worst.id) || S.city.places[0];
    const loc = Engine.loc(place.locId);
    S.contracts.push({
      id: "c" + (S.nextContractId++),
      client: "Der Rat der Stadt", locationId: loc.id, districtId: worst.id,
      ghosts: [{ id: "schleierfuerst", tier: 0, extra: [] }], threatEstimate: 10,
      payoutBase: 500, modifiers: [], penalties: { collateralPerUnit: 50, failure: 100 },
      intel: [], guaranteed: false, expiresDay: 9999, legend: true,
    });
    S.flags.legendOffered = true;
    Engine.log(S, `Der Rat der Stadt bittet um Hilfe: Der Schleierfürst wurde in ${worst.name} gesichtet. Ein legendärer Auftrag liegt vor.`, "warn");
  }
};

// ------------------------------------------------------------------ Tagestakt
Engine.nextDay = function (S) {
  if (S.mission || S.pendingEvent) return;
  S.day++;
  S.weather = Engine.rollWeather(S);

  // Ende der Tutorial-Phase (Tage 1–5)
  if (S.flags.tutorialActive && S.day >= 6) {
    S.flags.tutorialActive = false;
    Engine.log(S, "Die Schonfrist ist vorbei: Ab heute liest ihr die Sensorik selbst – und draußen warten Varianten, Eile und Mehrfach-Entitäten.", "warn");
  }

  const wages = S.hunters.reduce((a, h) => a + h.wage, 0);
  S.money -= wages;
  if (wages > 0) Engine.log(S, `Löhne gezahlt: −${wages} ÄK.`);

  const stressHeal = S.hq.unterkunft >= 2 ? 30 : (S.hq.unterkunft >= 1 ? 20 : 10);
  for (const h of S.hunters) {
    h.stress = Math.max(0, h.stress - stressHeal);
    if (h.injury !== "none") {
      h.injuryDays--;
      if (h.injuryDays <= 0) {
        Engine.log(S, `${h.name} ist wieder einsatzbereit.`, "good");
        h.injury = "none"; h.injuryDays = 0;
      }
    }
  }

  // Sensornetze: erledigen kleine Fälle (Bedrohung ≤ 3, Stufe ≤ 1) in ihren
  // Bezirken automatisch – 60 % Prämie, keine Essenzproben, kein Ruhm.
  for (const districtId of Object.keys(S.grids)) {
    const c = S.contracts.find((x) => x.districtId === districtId && !x.legend && !x.invasion &&
      !Engine.isAnomaly(x.ghosts[0].id) && x.threatEstimate <= 3 && x.ghosts.every((e) => e.tier <= 1));
    if (!c) continue;
    const d = Engine.district(S, districtId);
    if (rndChance(S, 0.75)) {
      const pay = Math.round(Engine.payout(S, c) * 0.6);
      S.money += pay;
      d.veil = Math.max(0, d.veil - 4);
      S.contracts = S.contracts.filter((x) => x.id !== c.id);
      Engine.log(S, `Sensornetz ${d.name}: ${Engine.loc(c.locationId).name} automatisch bereinigt (+${pay} ÄK, keine Essenzproben).`);
    } else {
      Engine.log(S, `Sensornetz ${d.name}: automatische Bannung fehlgeschlagen – der Fall bleibt offen.`, "warn");
    }
  }

  // Ablaufende Aufträge lassen den lokalen Schleier des Bezirks anschwellen –
  // wer Bezirke ignoriert, züchtet sich dort stärkere Varianten heran.
  for (const c of S.contracts) {
    if (c.expiresDay < S.day && !c.legend) {
      if (c.invasion) {
        // Ignorierte HQ-Invasion: Der Eindringling verwüstet einen Raum.
        Engine.hqRoomDowngrade(S, "Der Eindringling wütete unbehelligt im HQ");
        continue;
      }
      const d = Engine.district(S, c.districtId);
      d.veil = Math.min(100, d.veil + BAL().veil.expiryBump);
      Engine.log(S, `Auftrag in ${Engine.loc(c.locationId).name} verfallen – der Schleier über ${d.name} verdichtet sich.`, "warn");
    }
  }
  // Natürliches Abebben
  for (const d of S.city.districts) {
    if (d.veil > 0 && rndChance(S, BAL().veil.ebbChance)) d.veil = Math.max(0, d.veil - 1);
  }

  // Globaler Schleierdruck: Grundtick + Druck aus brodelnden Bezirken
  const boiling = S.city.districts.filter((d) => d.veil >= 80).length;
  S.schleier = Math.min(100, S.schleier + BAL().veil.tickBase + boiling);
  if (boiling > 0 && S.day % 3 === 0) {
    Engine.log(S, `${boiling} Bezirk(e) stehen kurz vor dem Kippen – der globale Schleierdruck steigt schneller.`, "warn");
  }

  if (S.money < BAL().grants.emergencyBelow && S.day - S.flags.lastGrantDay >= BAL().grants.emergencyCooldown) {
    S.money += BAL().grants.emergency; S.flags.lastGrantDay = S.day;
    Engine.log(S, `Notzuschuss der Stadt: +${BAL().grants.emergency} ÄK. (Die Lage ist ihnen nicht entgangen.)`, "good");
  }
  if (S.schleier > 70 && S.hq.garage === 1 && S.day % 4 === 0) {
    S.money += BAL().grants.catastrophe;
    Engine.log(S, `Katastrophenfonds: +${BAL().grants.catastrophe} ÄK, weil der Schleierdruck steigt und das HQ klein ist.`, "good");
  }
  if (S.hq.labor >= 2 && S.day - S.flags.lastLaborGrant >= 7) {
    S.money += BAL().grants.labor; S.flags.lastLaborGrant = S.day;
    Engine.log(S, `Forschungszuschuss (Labor-Meilenstein): +${BAL().grants.labor} ÄK.`, "good");
  }

  if (S.day % 7 === 0) { Engine.refreshCandidates(S); Engine.log(S, "Neue Bewerbungen sind eingegangen."); }

  Engine.generateContracts(S);

  // Rivalen-Agentur: schnappt sich lukrative Aufträge – erledigt sie aber
  // auch (Bezirks-Schleier sinkt). Ihr verliert nur das Geschäft.
  if (!S.flags.tutorialActive) {
    const stealable = S.contracts.filter((c) => !c.guaranteed && !c.legend && !c.invasion && !Engine.isAnomaly(c.ghosts[0].id));
    if (stealable.length >= 3 && rndChance(S, 0.3)) {
      const c = stealable.sort((a, b) => Engine.payout(S, b) - Engine.payout(S, a))[0];
      const d = Engine.district(S, c.districtId);
      d.veil = Math.max(0, d.veil - 4);
      S.contracts = S.contracts.filter((x) => x.id !== c.id);
      S.rival.taken++;
      Engine.log(S, `${S.rival.name} hat den Auftrag bei ${Engine.loc(c.locationId).name} übernommen (≈${Engine.payout(S, c)} ÄK entgangen).`, "warn");
    }
  }

  // HQ-Invasion: Kippt der Heimatbezirk (Schleier ≥ 90), dringen Entitäten
  // in die Garage ein – wer nicht verteidigt, verliert Raumstufen.
  const homeDistrict = Engine.district(S, S.city.hq.districtId);
  if (homeDistrict.veil >= BAL().invasion.minVeil && !S.contracts.some((c) => c.invasion) && rndChance(S, BAL().invasion.chance)) {
    const loc = Engine.loc("hq_verteidigung");
    const rank = rndWeighted(S, Engine.rankWeights(S));
    const ghost = Engine.pickGhostFor(S, loc, rank);
    const entry = Engine.makeGhostEntry(S, ghost, 0);
    const danger = Engine.entryDanger(entry);
    S.contracts.push({
      id: "c" + (S.nextContractId++),
      client: "GhostHQ selbst", locationId: loc.id, districtId: homeDistrict.id,
      ghosts: [entry], threatEstimate: Math.max(1, Math.min(12, danger)),
      payoutBase: 40, modifiers: ["noCollateral"],
      penalties: { collateralPerUnit: 30, failure: 0 },
      intel: [], guaranteed: false, expiresDay: S.day, legend: false, invasion: true,
    });
    Engine.log(S, `⚠ INVASION: Der Schleier über ${homeDistrict.name} ist gerissen – etwas ist in die Garage eingedrungen! Verteidigt das HQ noch heute.`, "bad");
  }

  // Tagesereignis (blockiert den nächsten Tag, bis entschieden wurde)
  if (!S.flags.tutorialActive && rndChance(S, 0.22)) {
    S.pendingEvent = { id: rndPick(S, DATA.EVENTS).id };
  }

  if (S.schleier >= 100 && !S.flags.lost) {
    S.flags.lost = true;
    Engine.log(S, "Der Schleier reißt. Die Stadt versinkt im Zwielicht. GhostHQ hat verloren.", "bad");
  }
};

// Zufälligen ausgebauten Raum um eine Stufe zurückwerfen (Garage min. 1)
Engine.hqRoomDowngrade = function (S, reason) {
  const built = Object.keys(DATA.ROOMS).filter((id) => S.hq[id] > (id === "garage" ? 1 : 0));
  if (!built.length) {
    Engine.log(S, `${reason} – zum Glück gab es nichts zu zerstören.`, "warn");
    return;
  }
  const roomId = rndPick(S, built);
  S.hq[roomId]--;
  Engine.log(S, `${reason}: ${DATA.ROOMS[roomId].name} wurde verwüstet (Stufe −1).`, "bad");
};

// ------------------------------------------------------------- HQ & Einkauf
Engine.upgradeRoom = function (S, roomId) {
  const room = DATA.ROOMS[roomId];
  const cur = S.hq[roomId];
  const next = room.levels.find((l) => l.level === cur + 1);
  if (!next || S.money < next.cost) return false;
  S.money -= next.cost;
  S.hq[roomId] = next.level;
  Engine.log(S, `${room.name} auf Stufe ${next.level} ausgebaut (−${next.cost} ÄK).`, "good");
  return true;
};

// Alle Konter-Methoden, die das aktuelle Inventar abdecken kann
Engine.ownedMethods = function (S) {
  const avail = new Set();
  for (const id of Object.keys(S.inventory)) {
    for (const m of Engine.eq(id).counters) avail.add(m);
  }
  return avail;
};

// Maximale Ladungen inkl. permanenter Labor-Mods
Engine.maxCharges = function (S, e) {
  if (e.charges === null) return null;
  return e.charges + (S.mods[e.id] || 0);
};

Engine.buyEquipment = function (S, equipId) {
  const e = Engine.eq(equipId);
  if (!e || e.craftOnly || S.inventory[equipId] || S.money < e.price) return false;
  if (e.tier > Engine.equipmentTierCap(S)) return false;
  const prev = DATA.EQUIPMENT.find((x) => x.upgradesTo === equipId);
  if (prev && !S.inventory[prev.id]) return false;
  S.money -= e.price;
  if (prev) delete S.inventory[prev.id];
  S.inventory[equipId] = { charges: e.charges };
  Engine.log(S, `${e.name} angeschafft (−${e.price} ÄK).`);
  return true;
};

Engine.refill = function (S, equipId) {
  const e = Engine.eq(equipId);
  const inv = S.inventory[equipId];
  if (!e || !inv || e.charges === null || !e.refillPrice || S.money < e.refillPrice) return false;
  const max = Engine.maxCharges(S, e);
  if (inv.charges >= max) return false;
  S.money -= e.refillPrice;
  inv.charges = max;
  Engine.log(S, `${e.name} aufgefüllt (−${e.refillPrice} ÄK).`);
  return true;
};

// ------------------------------------------------- Bibliothek, Labor, Netze
// Essenz-Sink: verbraucht die n GÜNSTIGSTEN Essenzen aus dem Lager.
Engine.essenceCount = (S) => S.stash.filter((x) => x.type === "essence").length;
Engine.consumeEssences = function (S, n) {
  const essences = S.stash
    .map((item, idx) => ({ item, idx }))
    .filter((x) => x.item.type === "essence")
    .sort((a, b) => Engine.lootValue(S, a.item) - Engine.lootValue(S, b.item));
  if (essences.length < n) return false;
  const removeIdx = essences.slice(0, n).map((x) => x.idx).sort((a, b) => b - a);
  for (const i of removeIdx) S.stash.splice(i, 1);
  return true;
};

Engine.buyBook = function (S, bookId) {
  const b = DATA.LIBRARY.find((x) => x.id === bookId);
  if (!b || S.library.includes(bookId)) return false;
  if (S.money < b.price || Engine.essenceCount(S) < b.essences) return false;
  S.money -= b.price;
  Engine.consumeEssences(S, b.essences);
  S.library.push(bookId);
  Engine.log(S, `Fachbuch erworben: „${b.name}“ (−${b.price} ÄK, −${b.essences} Essenzen).`, "good");
  return true;
};

// Labor-Crafting: Einweg-Wards (Konter-Notlösung) …
Engine.craftWard = function (S, method) {
  if (S.hq.labor < 1) return false;
  const e = Engine.eq("ward_" + method);
  if (!e) return false;
  const inv = S.inventory[e.id];
  if (inv && inv.charges >= Engine.maxCharges(S, e)) return false;
  if (S.money < 40 || Engine.essenceCount(S) < 3) return false;
  S.money -= 40;
  Engine.consumeEssences(S, 3);
  if (inv) inv.charges += 1;
  else S.inventory[e.id] = { charges: 1 };
  Engine.log(S, `Labor: ${e.name} hergestellt (−40 ÄK, −3 Essenzen).`);
  return true;
};

// … und permanente Kapazitäts-Mods für Verbrauchsgeräte.
Engine.craftMod = function (S, equipId) {
  if (S.hq.labor < 1) return false;
  const e = Engine.eq(equipId);
  if (!e || e.charges === null || e.craftOnly || !S.inventory[equipId]) return false;
  if (S.mods[equipId]) return false; // einmal pro Gerät
  if (S.money < 100 || Engine.essenceCount(S) < 4) return false;
  S.money -= 100;
  Engine.consumeEssences(S, 4);
  S.mods[equipId] = 1;
  Engine.log(S, `Labor: ${e.name} dauerhaft modifiziert (+1 Ladungskapazität).`, "good");
  return true;
};

// Sensornetz: löst in gesicherten Bezirken kleine Aufträge automatisch –
// gegen reduzierte Prämie und ohne Essenzproben (Studien bleiben Handarbeit).
Engine.buyGrid = function (S, districtId) {
  const d = Engine.district(S, districtId);
  if (!d || S.grids[districtId] || d.veil >= 30 || S.money < 300) return false;
  S.money -= 300;
  S.grids[districtId] = true;
  Engine.log(S, `Sensornetz in ${d.name} installiert (−300 ÄK). Kleine Fälle werden dort nun automatisch bearbeitet.`, "good");
  return true;
};

// Tagesereignis auflösen (a/b)
Engine.resolveEvent = function (S, choice) {
  if (!S.pendingEvent) return false;
  const ev = DATA.EVENTS.find((e) => e.id === S.pendingEvent.id);
  const opt = choice === "a" ? ev.a : ev.b;
  const fx = opt.effects;
  if (fx.money) S.money += fx.money;
  if (fx.rep) S.rep = Math.max(0, Math.min(100, S.rep + fx.rep));
  if (fx.schleier) S.schleier = Math.max(0, Math.min(100, S.schleier + fx.schleier));
  if (fx.stressAll) for (const h of S.hunters) h.stress = Math.max(0, Math.min(100, h.stress + fx.stressAll));
  if (fx.veilWorst) {
    const worst = [...S.city.districts].sort((a, b) => b.veil - a.veil)[0];
    worst.veil = Math.max(0, Math.min(100, worst.veil + fx.veilWorst));
  }
  if (fx.refillSalz && S.inventory["salz"]) S.inventory["salz"].charges = Engine.maxCharges(S, Engine.eq("salz"));
  if (fx.essence) S.stash.push({ type: "essence", name: "Konservierte Essenz", rarity: "uncommon", factionId: "vergessene" });
  Engine.log(S, `Ereignis: ${ev.text.slice(0, 60)}… → ${opt.label}`);
  S.pendingEvent = null;
  return true;
};

Engine.hire = function (S, idx) {
  const cand = S.candidates[idx];
  if (!cand || S.money < cand.fee) return false;
  S.money -= cand.fee;
  const h = Engine.addHunter(S, cand.class, cand.name, cand.quirk || null);
  h.wage = cand.wage;
  for (const l of (cand.legacies || [])) h.skills[l.skill] = (h.skills[l.skill] || 0) + 1;
  S.candidates.splice(idx, 1);
  Engine.log(S, `${h.name} (${DATA.CLASSES[h.class].name}) eingestellt.`, "good");
  return true;
};

Engine.fire = function (S, hunterId) {
  const i = S.hunters.findIndex((h) => h.id === hunterId);
  if (i < 0 || S.hunters.length <= 1) return false;
  Engine.log(S, `${S.hunters[i].name} verlässt das Team.`);
  S.hunters.splice(i, 1);
  return true;
};

Engine.sellLoot = function (S, idx) {
  const item = S.stash[idx];
  if (!item) return false;
  const v = Engine.lootValue(S, item);
  S.money += v;
  S.stash.splice(idx, 1);
  Engine.log(S, `${item.name} verkauft: +${v} ÄK.`);
  return true;
};

// =========================================================== ENCOUNTER-LOOP

Engine.hunterAvailable = function (h) {
  return h.injury !== "serious" && h.stress < 80;
};
Engine.effSkill = function (h, skill) {
  const malus = h.injury === "light" ? 1 : 0;
  return Math.max(0, (h.skills[skill] || 0) - malus);
};

Engine.startMission = function (S, contractId, teamIds) {
  const c = S.contracts.find((x) => x.id === contractId);
  if (!c || S.mission) return false;
  const team = teamIds.map((id) => Engine.hunter(S, id)).filter((h) => h && Engine.hunterAvailable(h));
  if (team.length === 0 || team.length > Engine.teamSize(S)) return false;
  const loc = Engine.loc(c.locationId);
  const travel = Engine.travelInfo(S, loc.id);
  S.money -= travel.cost;

  const envTags = Engine.effectiveEnv(S, loc);
  const bestAufkl = Math.max(...team.map((h) => Engine.effSkill(h, "aufklaerung")));
  let scans = 3 + Math.floor(bestAufkl / 3);
  if (S.hq.archiv >= 2) scans += 1;
  if (Engine.know(S, c.ghosts[0].id, "zyklus")) scans += 1;
  if (envTags.includes("dunkel")) scans -= 1;
  if (S.weather === "nebel" && loc.outdoor) scans -= 1;
  if (c.modifiers.includes("rush") && travel.far) scans -= 1; // späte Ankunft
  scans = Math.max(2, scans);

  const M = {
    contractId, teamIds: team.map((h) => h.id),
    phase: "diagnose",
    envTags,
    travelCost: travel.cost,
    scansLeft: scans,
    scannedChannels: {},
    observed: [],      // Berichte: {channel, kind, options, text, viaSenses}
    freeTells: [],     // sichere Vorab-Hinweise (Archiv/Grimoire)
    factionHint: null,
    placements: [],
    usedCharges: {},
    result: null,
  };

  // Vorab-Wissen: Archiv-Intel + Grimoire „Wirken am Ort“
  const primary = Engine.ghost(c.ghosts[0].id);
  const tellTraits = Engine.effectiveTraits(c.ghosts[0]).filter((t) => DATA.TRAITS[t].channel);
  if (S.hq.archiv >= 1 && tellTraits.length) {
    M.freeTells.push({ trait: tellTraits[rndInt(S, 0, tellTraits.length - 1)], source: "Archiv-Intel" });
  }
  if (Engine.know(S, primary.id, "wirken")) {
    const t = primary.traits.find((x) => DATA.TRAITS[x].channel && !M.freeTells.some((f) => f.trait === x));
    if (t) M.freeTells.push({ trait: t, source: "Grimoire: Wirken am Ort" });
  }
  if (S.hq.archiv >= 2) M.factionHint = primary.factionId;

  S.mission = M;
  Engine.log(S, `Einsatz begonnen: ${loc.name} (Anfahrt −${travel.cost} ÄK, ${DATA.WEATHER[S.weather].name}).`);
  return true;
};

Engine.missionContract = (S) =>
  S.contracts.find((c) => c.id === S.mission.contractId) || S.mission.contractSnapshot;

Engine.availableChannels = function (S) {
  const channels = { visuell: true };
  for (const id of Object.keys(S.inventory)) {
    const e = Engine.eq(id);
    if (e && e.diagnostics) channels[e.diagnostics] = true;
  }
  return Object.keys(channels);
};

Engine.scannerTier = function (S, channel) {
  let tier = 0;
  for (const id of Object.keys(S.inventory)) {
    const e = Engine.eq(id);
    if (e && e.diagnostics === channel) tier = Math.max(tier, e.tier);
  }
  return tier;
};

Engine.missionTeam = (S) => S.mission.teamIds.map((id) => Engine.hunter(S, id));
Engine.bestTeamSkill = function (S, skill) {
  return Math.max(...Engine.missionTeam(S).map((h) => Engine.effSkill(h, skill)));
};

// Lesbarkeit einer Spur: Werkzeug-Tier + Aufklärung gegen die Subtilität.
// „Sinne“ (visuell) zählen als Werkzeug-Tier 1, mit hoher Aufklärung Tier 2.
Engine.clarityScore = function (S, channel) {
  const aufkl = Engine.bestTeamSkill(S, "aufklaerung");
  const toolTier = channel === "visuell" ? (aufkl >= 4 ? 2 : 1) : Engine.scannerTier(S, channel);
  return toolTier * 2 + Math.floor(aufkl / 2);
};

// Ein Scan liest alle Spuren eines Kanals – aber nicht immer eindeutig:
// subtile Spuren werden mit ihrem Verwechslungspartner gemeldet, Varianten
// jenseits des Grimoire-Wissens bleiben komplett verschleiert.
Engine.scan = function (S, channel) {
  const M = S.mission;
  if (!M || M.phase !== "diagnose" || M.scannedChannels[channel]) return null;
  const c = Engine.missionContract(S);

  const freeAudio = channel === "audio" && (M.envTags.includes("echoey") || S.inventory["audio2"]);
  if (!freeAudio) {
    if (M.scansLeft <= 0) return null;
    M.scansLeft--;
  }
  M.scannedChannels[channel] = true;

  // Elektrifiziert stört T1-EMF komplett
  if (channel === "emf" && M.envTags.includes("elektrifiziert") && Engine.scannerTier(S, "emf") < 2) {
    M.observed.push({ channel, kind: "jammed", options: [], text: "Störsignal – Messung unbrauchbar (Spektralanalyse T2 nötig)." });
    return true;
  }

  const clarity = Engine.clarityScore(S, channel);
  const aufkl = Engine.bestTeamSkill(S, "aufklaerung");
  let found = 0;

  for (const entry of c.ghosts) {
    const locked = entry.tier > Engine.allowedTier(S, entry.id);
    const traits = Engine.effectiveTraits(entry).filter((t) => DATA.TRAITS[t].channel === channel);
    if (!traits.length) continue;
    if (locked) {
      // Unbekannte Variante: Spuren sind da, aber unlesbar wirr
      if (!M.observed.some((o) => o.channel === channel && o.kind === "obscured")) {
        M.observed.push({ channel, kind: "obscured", options: [], text: "Wirre, verschleierte Spuren – dieses Muster übersteigt euer Grimoire-Wissen." });
      }
      found++;
      continue;
    }
    for (const t of traits) {
      if (M.observed.some((o) => o.channel === channel && o.options.includes(t) && !o.viaSenses)) { found++; continue; }
      const def = DATA.TRAITS[t];
      const knownSpuren = Engine.know(S, entry.id, "spuren");
      const clear = knownSpuren || !def.confusableWith || clarity >= def.subtlety + 1;
      // „Known Unknowns“: Unscharfe Berichte erklären, WAS die Spur eindeutig
      // machen würde – ökonomische Richtung ohne Identitäts-Spoiler.
      const remedy = channel === "visuell"
        ? "höhere Aufklärung würde die Spur eindeutig machen"
        : "ein besseres Gerät (T2) oder höhere Aufklärung würde die Spur eindeutig machen";
      M.observed.push(clear
        ? { channel, kind: "clear", options: [t], text: def.tell + (knownSpuren ? " (Grimoire: eindeutig zugeordnet)" : "") }
        : { channel, kind: "ambiguous", options: [t, def.confusableWith].sort(), text: `${def.ambiguous} — unscharf: ${remedy}.` });
      found++;
    }
  }

  // „Mit bloßen Sinnen“: ein visueller Rundgang mit hoher Aufklärung erspürt
  // auch Spuren anderer Kanäle – vage, aber ohne Gerät. (Werkzeug-exklusive
  // Spuren wie Elektrostatik oder Schattenformen bleiben unsichtbar.)
  if (channel === "visuell" && aufkl >= 3) {
    for (const entry of c.ghosts) {
      if (entry.tier > Engine.allowedTier(S, entry.id)) continue;
      for (const t of Engine.effectiveTraits(entry)) {
        const def = DATA.TRAITS[t];
        if (!def.channel || def.channel === "visuell" || !def.senses) continue;
        if (M.observed.some((o) => o.options.includes(t))) continue;
        const opts = def.confusableWith ? [t, def.confusableWith].sort() : [t];
        M.observed.push({
          channel: def.channel, kind: opts.length > 1 ? "ambiguous" : "clear", options: opts, viaSenses: true,
          text: (opts.length > 1 ? def.ambiguous : def.tell) + " (mit bloßen Sinnen erspürt)",
        });
        found++;
      }
    }
  }

  if (found === 0) {
    M.observed.push({ channel, kind: "none", options: [], text: "keine Auffälligkeiten. (Auch das ist ein Hinweis!)" });
  }

  // Geräte-Boni
  if (channel === "thermo" && Engine.scannerTier(S, "thermo") >= 2 && !M.scannedChannels["visuell"]) {
    for (const entry of c.ghosts) {
      if (entry.tier > Engine.allowedTier(S, entry.id)) continue;
      const t = Engine.effectiveTraits(entry).find((x) => DATA.TRAITS[x].channel === "visuell" && !M.observed.some((o) => o.options.includes(x)));
      if (t) {
        M.observed.push({ channel: "visuell", kind: "clear", options: [t], viaSenses: true, text: DATA.TRAITS[t].tell + " (Langzeit-Heatmap)" });
        break;
      }
    }
  }
  if (channel === "emf" && Engine.scannerTier(S, "emf") >= 3) {
    M.factionHint = Engine.ghost(c.ghosts[0].id).factionId;
  }
  return true;
};

// Verdächtige: Geister, deren Basis-Spuren zu allen vollständig gescannten
// Kanälen passen. Überzählige Beobachtungen schließen NICHT aus (könnten von
// einer Variante oder zweiten Entität stammen) – fehlende erwartete Spuren tun es.
Engine.suspects = function (S) {
  const M = S.mission;
  const c = Engine.missionContract(S);
  // Anomalien stehen in keinem Kodex – hier zählt nur Spur → Konter.
  if (Engine.isAnomaly(c.ghosts[0].id)) return [];
  const multi = c.modifiers.includes("multipleEntities");
  const result = [];
  for (const g of DATA.GHOSTS) {
    if (g.rank === "legend" && !c.legend) continue;
    if (M.factionHint && g.factionId !== M.factionHint) continue;
    if (!multi && M.freeTells.some((f) => !g.traits.includes(f.trait))) continue;
    let ok = true;
    let unexplained = 0;
    for (const channel of Object.keys(M.scannedChannels)) {
      const chEntries = M.observed.filter((o) => o.channel === channel && !o.viaSenses);
      if (chEntries.some((o) => o.kind === "jammed" || o.kind === "obscured")) continue; // keine verlässliche Info
      const usable = chEntries.filter((o) => o.kind === "clear" || o.kind === "ambiguous");
      const own = g.traits.filter((t) => DATA.TRAITS[t].channel === channel);
      // Zuordnung: jede eigene Spur braucht einen eigenen passenden Bericht
      const used = new Array(usable.length).fill(false);
      const assign = (i) => {
        if (i >= own.length) return true;
        for (let j = 0; j < usable.length; j++) {
          if (!used[j] && usable[j].options.includes(own[i])) {
            used[j] = true;
            if (assign(i + 1)) return true;
            used[j] = false;
          }
        }
        return false;
      };
      if (!assign(0)) { ok = false; break; }
      unexplained += usable.filter((_, j) => !used[j]).length;
    }
    if (ok) result.push({ ghost: g, unexplained });
  }
  return result;
};

Engine.toPreparation = function (S) {
  if (S.mission && S.mission.phase === "diagnose") S.mission.phase = "vorbereitung";
};

Engine.placementOptions = function (S) {
  const opts = [];
  for (const id of Object.keys(S.inventory)) {
    const e = Engine.eq(id);
    if (!e || !e.counters.length) continue;
    for (const m of e.counters) opts.push({ equipId: id, method: m });
  }
  return opts;
};

Engine.maxPlacements = function (S) {
  return 3 + Math.floor(Engine.bestTeamSkill(S, "fallen") / 3);
};

Engine.chargesLeft = function (S, equipId) {
  const e = Engine.eq(equipId);
  const inv = S.inventory[equipId];
  if (!e || !inv) return 0;
  if (e.charges === null) return Infinity;
  const used = (S.mission && S.mission.usedCharges[equipId]) || 0;
  return inv.charges - used;
};

Engine.togglePlacement = function (S, equipId, method) {
  const M = S.mission;
  if (!M || M.phase !== "vorbereitung") return false;
  const i = M.placements.findIndex((p) => p.equipId === equipId && p.method === method);
  if (i >= 0) {
    M.placements.splice(i, 1);
    M.usedCharges[equipId] = (M.usedCharges[equipId] || 0) - 1;
    return true;
  }
  if (M.placements.length >= Engine.maxPlacements(S)) return false;
  if (Engine.chargesLeft(S, equipId) <= 0) return false;
  M.placements.push({ equipId, method });
  M.usedCharges[equipId] = (M.usedCharges[equipId] || 0) + 1;
  return true;
};

// ------------------------------------------------- Ausführung & Auswertung
Engine.requiredMethods = function (c) {
  const methods = [];
  for (const entry of c.ghosts) {
    for (const t of Engine.effectiveTraits(entry)) {
      const def = DATA.TRAITS[t];
      if (def.counter && !methods.includes(def.counter)) methods.push(def.counter);
    }
  }
  return methods;
};

Engine.executionPreview = function (S) {
  const M = S.mission;
  const c = Engine.missionContract(S);
  const team = Engine.missionTeam(S);
  const primaryId = c.ghosts[0].id;

  const required = Engine.requiredMethods(c);
  const placed = [...new Set(M.placements.map((p) => p.method))];
  const matched = required.filter((m) => placed.includes(m));
  const coverage = required.length ? matched.length / required.length : 1;

  let envBonus = 0;
  const tags = M.envTags;
  if ((tags.includes("damp") || tags.includes("laufwasser")) && placed.includes("salz")) envBonus += 0.05;
  if (tags.includes("eisen") && placed.includes("erdung")) envBonus += 0.05;
  if (tags.includes("sanctified") && (placed.includes("bann") || placed.includes("stille"))) envBonus += 0.10;
  const hasIronWeak = c.ghosts.some((e) => Engine.effectiveTraits(e).includes("eisen-schwaeche"));
  if (tags.includes("eisen") && hasIronWeak) envBonus += 0.10;
  if (S.hq.kapelle >= 1 && (placed.includes("bann") || placed.includes("stille"))) envBonus += 0.05 * S.hq.kapelle;

  let knowBonus = 0;
  if (Engine.know(S, primaryId, "bann")) knowBonus += 0.10;
  if (Engine.know(S, primaryId, "varianten2")) knowBonus += 0.05;
  if (Engine.know(S, primaryId, "meister")) knowBonus += 0.15;

  // Eigenheiten der Jäger:innen reagieren auf die Umgebung
  let quirkBonus = 0;
  const quirkNotes = [];
  for (const h of team) {
    if (!h.quirk) continue;
    const q = DATA.QUIRKS.find((x) => x.id === h.quirk);
    if (q && tags.includes(q.tag)) {
      quirkBonus += q.delta;
      quirkNotes.push({ hunter: h.name, name: q.name, delta: q.delta });
    }
  }

  const skillSum = team.reduce((a, h) => a + Engine.effSkill(h, "rituale") + Engine.effSkill(h, "fallen"), 0);
  const danger = Engine.contractDanger(c);

  // Ohne passende Konter gibt es praktisch keine Chance (Basis siehe BALANCE).
  const CH = BAL().chance;
  let chance = CH.base + CH.coverage * coverage + CH.skill * skillSum + envBonus + knowBonus + quirkBonus - CH.dangerPen * danger;
  chance = Math.max(CH.min, Math.min(CH.max, chance));
  // Unbekannte Varianten sind faktisch unbannbar – das Grimoire ist der Schlüssel.
  const lockedVariant = c.ghosts.some((e) => e.tier > Engine.allowedTier(S, e.id));
  if (lockedVariant) chance = Math.min(chance, CH.variantCap);

  const CO = BAL().collateral;
  let collateral = CO.base - CO.coverageRelief * coverage;
  for (const t of tags) if (t === "flammable" || t === "cluttered") collateral += CO.envRisk;
  const loc = Engine.loc(c.locationId);
  for (const hz of loc.hazards) collateral += (DATA.HAZARD_INFO[hz] ? DATA.HAZARD_INFO[hz].collateral : 0);
  collateral -= CO.sichRelief * Engine.bestTeamSkill(S, "sicherheit");
  if (Engine.know(S, primaryId, "meister")) collateral *= 0.5;
  collateral = Math.max(CO.min, Math.min(CO.max, collateral));

  return { required, placed, matched, coverage, chance, collateral, danger, envBonus, knowBonus, quirkBonus, quirkNotes, lockedVariant };
};

// ------------------------------------------- Hinweis-Framework (Vorbereitung)
// Kontextuelle Hinweise werden freigeschaltet durch: (A) Personal-Kompetenz,
// (B) Fachbücher der Bibliothek, (C) Grimoire-Schwachstellenanalyse.
// Während der Tutorial-Phase gilt Volloffenlegung.
Engine.prepHints = function (S) {
  const M = S.mission;
  const c = Engine.missionContract(S);
  const hints = [];        // {icon, source, text}
  const hintedMethods = {}; // methodTag -> Quellenname (für 📖-Markierung)

  if (S.flags.tutorialActive) {
    const req = Engine.requiredMethods(c);
    const avail = Engine.ownedMethods(S);
    const missing = req.filter((m) => !avail.has(m));
    let text = "Ausbilderin: Diese Entität erfordert " + req.map((m) => DATA.METHODS[m].name).join(" + ") + ".";
    if (missing.length) {
      const needs = missing.map((m) => {
        const e = DATA.EQUIPMENT.find((x) => !x.craftOnly && x.counters.includes(m));
        return `${DATA.METHODS[m].name} → ${e ? e.name : "?"} (Händler${e && e.tier > 1 ? ", benötigt Werkstatt" : ""})`;
      });
      text += " Euch fehlt dafür noch: " + needs.join("; ") + ". Ohne passenden Konter lohnt der Rückzug.";
    } else {
      text += " Platziert genau diese Maßnahmen.";
    }
    hints.push({ icon: "🎓", source: "Tutorial", text });
    for (const m of req) hintedMethods[m] = "Tutorial";
    return { hints, hintedMethods };
  }

  // (A) Personal: erfahrene Späher:innen lesen die Umgebung taktisch
  const team = Engine.missionTeam(S);
  const scout = team.filter((h) => Engine.effSkill(h, "aufklaerung") >= 4)
    .sort((a, b) => Engine.effSkill(b, "aufklaerung") - Engine.effSkill(a, "aufklaerung"))[0];
  if (scout) {
    const envTips = [
      { tags: ["damp", "laufwasser"], text: "Feuchte Böden – Salzlinien wirken hier spürbar stärker.", method: "salz" },
      { tags: ["eisen"], text: "Eisenlastige Struktur – Erdungsstangen greifen hier besser.", method: "erdung" },
      { tags: ["sanctified"], text: "Geweihter Grund – Bann- und Stille-Sigillen entfalten hier volle Kraft.", method: "bann" },
    ];
    for (const tip of envTips) {
      if (tip.tags.some((t) => M.envTags.includes(t))) {
        hints.push({ icon: "🧭", source: `Späher:in ${scout.name}`, text: tip.text });
      }
    }
  }

  // (B) Bibliothek: Bücher bestätigen Konter, wenn die Entität passt
  const required = Engine.requiredMethods(c);
  for (const bookId of S.library) {
    const b = DATA.LIBRARY.find((x) => x.id === bookId);
    for (const m of b.methods) {
      if (required.includes(m) && !hintedMethods[m]) {
        hintedMethods[m] = `Fachbuch: ${b.name}`;
        hints.push({ icon: "📖", source: `Fachbuch „${b.name}“`, text: `${DATA.METHODS[m].name} ist gegen das Bewegungs-/Wirkmuster dieser Entität nachweislich hochwirksam.` });
      }
    }
  }

  // (C) Grimoire: Schwachstellenanalyse bei eindeutiger Identifikation
  const suspects = Engine.suspects(S);
  if (suspects.length === 1 && Engine.know(S, suspects[0].ghost.id, "schwachstellen")) {
    const g = suspects[0].ghost;
    const counters = [...new Set(g.traits.map((t) => DATA.TRAITS[t].counter).filter(Boolean))];
    for (const m of counters) if (!hintedMethods[m]) hintedMethods[m] = "Grimoire: Schwachstellenanalyse";
    hints.push({
      icon: "📖", source: "Grimoire: Schwachstellenanalyse",
      text: `${g.name} erfordert: ${counters.map((m) => DATA.METHODS[m].name).join(" + ")}. (Varianten können zusätzliche Konter brauchen!)`,
    });
  }

  return { hints, hintedMethods };
};

Engine.execute = function (S) {
  const M = S.mission;
  if (!M || M.phase !== "vorbereitung") return null;
  const c = Engine.missionContract(S);
  const team = Engine.missionTeam(S);
  const pv = Engine.executionPreview(S);
  const primaryId = c.ghosts[0].id;

  for (const [id, n] of Object.entries(M.usedCharges)) {
    const inv = S.inventory[id];
    const e = Engine.eq(id);
    if (inv && e && e.charges !== null) inv.charges = Math.max(0, inv.charges - Math.max(0, n));
  }

  const success = rndChance(S, pv.chance);
  const collateralHit = rndChance(S, pv.collateral);
  const usedIds = [...new Set(M.placements.map((p) => p.equipId))];
  const maintenance = Engine.maintenanceCost(S, usedIds);
  const district = Engine.district(S, c.districtId);

  const R = {
    success, collateral: success && collateralHit, collateralUnits: 0,
    pay: 0, cleanBonus: 0, penalty: 0, maintenance, travelCost: M.travelCost,
    loot: [], injuries: [], specimens: [], xp: 0, repDelta: 0, schleierDelta: 0, districtDelta: 0,
    ghostNames: c.ghosts.map((e) => Engine.ghostDisplayName(e)),
    chance: pv.chance, retry: false,
  };

  const hasSani = team.some((h) => h.class === "sanitaeter");
  let dmgMod = hasSani ? 0.5 : 1;
  if (Engine.know(S, primaryId, "gefahr")) dmgMod *= 0.5;

  if (success) {
    R.pay = Engine.payout(S, c);
    if (!R.collateral) {
      R.cleanBonus = Math.round(R.pay * 0.2);
      S.stats.cleanStreak++;
    } else {
      R.collateralUnits = rndInt(S, 1, 3);
      R.penalty = c.penalties.collateralPerUnit * R.collateralUnits;
      if (c.modifiers.includes("noCollateral")) R.penalty *= 2;
      S.stats.cleanStreak = 0;
      for (const h of team) if (rndChance(S, 0.2 * dmgMod)) R.injuries.push({ id: h.id, name: h.name, kind: "light" });
    }
    for (const entry of c.ghosts) {
      const g = Engine.ghost(entry.id);
      for (const l of g.loot) {
        if (rndChance(S, l.rarity === "common" ? 0.9 : l.rarity === "uncommon" ? 0.7 : l.rarity === "rare" ? 0.55 : 0.45)) {
          R.loot.push({ type: l.type, name: l.name, rarity: l.rarity, factionId: g.factionId, ghostId: g.id });
        }
      }
      // Essenzproben fürs Grimoire – Anomalien sind nicht studierbar
      if (!Engine.isAnomaly(entry.id)) {
        const grim = Engine.grim(S, entry.id);
        let n = 1;
        if (!R.collateral && Engine.know(S, entry.id, "essenz")) n += 1;
        grim.specimens += n;
        R.specimens.push({ ghostId: entry.id, name: g.name, n });
        S.codexSeen[entry.id] = true;
      }
    }
    R.repDelta = R.collateral ? 2 : 4;
    R.schleierDelta = R.collateral ? -1 : -2;
    R.districtDelta = -BAL().veil.successRelief;
    if (Engine.isAnomaly(c.ghosts[0].id)) { R.repDelta = 8; R.schleierDelta = -5; R.districtDelta = -15; }
    if (c.legend) { R.repDelta = 20; R.schleierDelta = -30; R.districtDelta = -40; }
    R.xp = Math.ceil(pv.danger / c.ghosts.length);
    S.stats.banished += c.ghosts.length;
  } else {
    R.penalty = c.penalties.failure;
    R.repDelta = -3;
    R.schleierDelta = +3;
    R.districtDelta = +BAL().veil.failBump;
    R.xp = 1;
    S.stats.failed++;
    S.stats.cleanStreak = 0;
    for (const entry of c.ghosts) if (!Engine.isAnomaly(entry.id)) S.codexSeen[entry.id] = true;
    if (c.invasion) Engine.hqRoomDowngrade(S, "Die Verteidigung des HQ scheiterte");
    for (const h of team) {
      if (rndChance(S, 0.15 * dmgMod)) R.injuries.push({ id: h.id, name: h.name, kind: "serious" });
      else if (rndChance(S, 0.4 * dmgMod)) R.injuries.push({ id: h.id, name: h.name, kind: "light" });
    }
    if (Engine.know(S, primaryId, "verhalten") && !c.legend) R.retry = true;
  }

  S.money += R.pay + R.cleanBonus - R.penalty - R.maintenance;
  S.rep = Math.max(0, Math.min(100, S.rep + R.repDelta));
  S.schleier = Math.max(0, Math.min(100, S.schleier + R.schleierDelta));
  if (district) district.veil = Math.max(0, Math.min(100, district.veil + R.districtDelta));

  const lightDays = S.hq.unterkunft >= 1 ? 1 : 2;
  const seriousDays = S.hq.unterkunft >= 2 ? 4 : 6;
  for (const inj of R.injuries) {
    const h = Engine.hunter(S, inj.id);
    if (inj.kind === "serious") { h.injury = "serious"; h.injuryDays = seriousDays; }
    else if (h.injury === "none") { h.injury = "light"; h.injuryDays = lightDays; }
  }
  for (const h of team) {
    h.stress = Math.min(100, h.stress + (success ? BAL().stress.missionSuccess : BAL().stress.missionFail));
    h.xp += R.xp;
    while (h.xp >= h.level * 10) {
      h.xp -= h.level * 10;
      h.level++;
      const prim = DATA.CLASSES[h.class].primary;
      h.skills[prim]++;
      h.wage += 3;
      Engine.log(S, `${h.name} steigt auf Stufe ${h.level} (${DATA.SKILL_NAMES[prim]} +1).`, "good");
    }
  }
  S.stash.push(...R.loot);

  M.contractSnapshot = c;
  S.contracts = S.contracts.filter((x) => x.id !== c.id);
  if (R.retry) {
    c.expiresDay = S.day + 2;
    S.contracts.push(c);
    Engine.log(S, `Dank des Grimoire-Wissens über Verhaltensmuster bleibt die Spur warm – der Auftrag besteht weiter.`, "warn");
  }
  if (c.legend && success) {
    S.flags.won = true;
    Engine.log(S, "DER SCHLEIERFÜRST IST GEBANNT. Die Stadt atmet auf – GhostHQ hat Geschichte geschrieben.", "good");
  } else if (c.legend && !success) {
    S.flags.legendOffered = false;
  }

  Engine.log(S,
    success
      ? `Einsatz erfolgreich: ${R.ghostNames.join(" & ")} gebannt (+${R.pay + R.cleanBonus} ÄK${R.penalty ? ", Kollateral −" + R.penalty : ""}).`
      : `Einsatz gescheitert: ${R.ghostNames.join(" & ")} entkam. Strafe −${R.penalty} ÄK.`,
    success ? "good" : "bad");

  M.phase = "nachwirkung";
  M.result = R;
  return R;
};

Engine.abortMission = function (S) {
  const M = S.mission;
  if (!M || M.phase === "nachwirkung") return false;
  const c = Engine.missionContract(S);
  S.rep = Math.max(0, S.rep - 1);
  Engine.log(S, `Einsatz bei ${Engine.loc(c.locationId).name} abgebrochen. Der Auftrag bleibt offen (Anfahrt war umsonst).`);
  S.mission = null;
  return true;
};

Engine.finishMission = function (S) {
  if (S.mission && S.mission.phase === "nachwirkung") S.mission = null;
};

// ------------------------------------------------------------ Speichern/Laden
Engine.save = function (S) {
  try { localStorage.setItem("ghosthq_save", JSON.stringify(S)); } catch (e) { /* Speicher voll o.ä. */ }
};
Engine.load = function () {
  try {
    const raw = localStorage.getItem("ghosthq_save");
    if (!raw) return null;
    const S = JSON.parse(raw);
    return S.version === Engine.SAVE_VERSION ? S : null; // alte Stände verwerfen
  } catch (e) { return null; }
};
Engine.clearSave = function () {
  try { localStorage.removeItem("ghosthq_save"); } catch (e) { /* ignorieren */ }
};

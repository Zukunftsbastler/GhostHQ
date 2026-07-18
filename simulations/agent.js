// Heuristischer, deterministischer Agent für GhostHQ-Balancing-Läufe.
// Spielt FAIR: nutzt ausschließlich Informationen, die auch die UI zeigt
// (Verdächtigen-Liste, Prognose, Hinweise, Habitat-Vermutung nur bei Wissen).
"use strict";

function createAgent(G) {
  const { Engine, DATA } = G;

  // ------------------------------------------------------------ Ereignisse
  function eventUtility(S, effects) {
    let u = 0;
    if (effects.money) u += effects.money;
    if (effects.rep) u += effects.rep * 8;
    if (effects.stressAll) u -= effects.stressAll * 1.5 * S.hunters.length;
    if (effects.veilWorst) u -= effects.veilWorst * 6;
    if (effects.schleier) u -= effects.schleier * 12;
    if (effects.refillSalz) u += 20;
    if (effects.essence) u += 40;
    return u;
  }
  function handleEvent(S, rec) {
    if (!S.pendingEvent) return;
    const ev = DATA.EVENTS.find((e) => e.id === S.pendingEvent.id);
    const pick = eventUtility(S, ev.a.effects) >= eventUtility(S, ev.b.effects) ? "a" : "b";
    Engine.resolveEvent(S, pick);
    rec.events++;
  }

  // ------------------------------------------------------------- Wirtschaft
  function wagesPerDay(S) { return S.hunters.reduce((a, h) => a + h.wage, 0); }
  function buffer(S) { return 120 + 2 * wagesPerDay(S); }

  function sellLoot(S) {
    // Artefakte immer verkaufen; Essenzen mit Reserve fürs Studium/Labor
    const reserve = S.hq.labor >= 1 ? 8 : (S.hq.archiv >= 1 ? 5 : 2);
    for (let i = S.stash.length - 1; i >= 0; i--) {
      if (S.stash[i].type !== "essence") Engine.sellLoot(S, i);
    }
    let essences = Engine.essenceCount(S);
    const target = S.money < 60 ? 0 : reserve;
    for (let i = S.stash.length - 1; i >= 0 && essences > target; i--) {
      if (S.stash[i].type === "essence") { Engine.sellLoot(S, i); essences--; }
    }
  }

  function study(S, rec) {
    if (S.hq.archiv < 1 || S.flags.studiedDay === S.day) return;
    // Tief vor breit: den am weitesten erforschten Typ zuerst vorantreiben –
    // nur so werden Variantenkunde und Meisterschaft im Spielverlauf erreichbar.
    let best = null;
    for (const [gid, g] of Object.entries(S.grimoire)) {
      if (g.specimens < 1 || !Engine.nextKnowledge(S, gid)) continue;
      if (!best || g.points > S.grimoire[best].points ||
          (g.points === S.grimoire[best].points && g.specimens > S.grimoire[best].specimens)) best = gid;
    }
    if (best && Engine.study(S, best)) rec.studies++;
  }

  // Einkaufsreihenfolge: erst Diagnose+Konter-Breite, dann Komfort/Endgame.
  const BUY_PLAN = [
    { kind: "room", id: "archiv" },   // Intel + Studien
    { kind: "room", id: "werkstatt" },// schaltet T2 frei
    { kind: "equip", id: "sigill" },  // stille/bann/schutz – größter Konter-Sprung
    { kind: "equip", id: "thermo1" },
    { kind: "equip", id: "audio1" },
    { kind: "equip", id: "tuecher" },
    { kind: "room", id: "labor" },
    { kind: "equip", id: "laterne" },
    { kind: "room", id: "unterkunft" },
    { kind: "room", id: "garage" },   // Stufe 2: Teamgröße 3
    { kind: "equip", id: "emf2" },
    { kind: "room", id: "werkstatt" },// Stufe 2: schaltet T3 frei
    { kind: "equip", id: "zeitanker" },
    { kind: "book", id: "sigil_studies" },
    { kind: "room", id: "kapelle" },
    { kind: "room", id: "archiv" },   // Stufe 2
    { kind: "equip", id: "audio2" },
    { kind: "equip", id: "thermo2" },
    { kind: "book", id: "salt_defense" },
    { kind: "room", id: "labor" },    // Stufe 2
    { kind: "equip", id: "emf3" },
    { kind: "room", id: "unterkunft" },
    { kind: "room", id: "garage" },   // Stufe 3
    { kind: "room", id: "kapelle" },
  ];

  function shop(S, rec) {
    for (const step of BUY_PLAN) {
      if (S.money <= buffer(S)) break;
      let done = false;
      if (step.kind === "room") done = Engine.upgradeRoom(S, step.id);
      else if (step.kind === "equip") done = Engine.buyEquipment(S, step.id);
      else if (step.kind === "book") done = Engine.buyBook(S, step.id);
      if (done) {
        if (!(step.id in rec.firstBuy)) rec.firstBuy[step.id] = S.day;
        rec.purchases++;
      }
    }
    // Nachfüllen, wenn Ladungen knapp
    for (const id of ["salz", "sigill", "tuecher"]) {
      const inv = S.inventory[id];
      if (inv && inv.charges <= 1 && S.money > buffer(S) / 2) {
        if (Engine.refill(S, id)) rec.refills++;
      }
    }
    // Labor-Schmiede: fehlende Konter-Methoden als Ward abdecken
    if (S.hq.labor >= 1 && Engine.essenceCount(S) >= 6) {
      const owned = Engine.ownedMethods(S);
      const missing = Object.keys(DATA.METHODS).find((m) => !owned.has(m));
      if (missing && Engine.craftWard(S, missing)) rec.wards++;
    }
    if (S.hq.labor >= 1 && Engine.essenceCount(S) >= 8 && S.inventory["salz"] && !S.mods["salz"]) {
      if (Engine.craftMod(S, "salz")) rec.mods++;
    }
    // Personal: bis Teamgröße+1, Späher/Sanitäter bevorzugt
    if (S.hunters.length < Engine.teamSize(S) + 1 && S.money > 550) {
      const have = new Set(S.hunters.map((h) => h.class));
      let idx = S.candidates.findIndex((c) => !have.has(c.class) && (c.class === "spaeher" || c.class === "sanitaeter"));
      if (idx < 0) idx = S.candidates.findIndex((c) => !have.has(c.class));
      if (idx < 0) idx = 0;
      if (Engine.hire(S, idx)) rec.hires++;
    }
    // Sensornetz in gesicherten Bezirken, wenn Kasse üppig
    if (S.money > 900) {
      const d = S.city.districts.find((x) => x.veil < 30 && !S.grids[x.id]);
      if (d && Engine.buyGrid(S, d.id)) rec.grids++;
    }
  }

  // -------------------------------------------------------------- Aufträge
  function estimateChance(S, c) {
    // Grobe Vorab-Schätzung nur aus sichtbaren Größen
    const owned = Engine.ownedMethods(S).size;
    const estCov = Math.min(1, owned / 4);
    const team = S.hunters.filter(Engine.hunterAvailable).slice(0, Engine.teamSize(S));
    const skillSum = team.reduce((a, h) => a + Engine.effSkill(h, "rituale") + Engine.effSkill(h, "fallen"), 0);
    const CH = DATA.BALANCE.chance;
    return Math.max(0.05, Math.min(0.9,
      CH.base + CH.coverage * estCov + CH.skill * skillSum - CH.dangerPen * c.threatEstimate));
  }

  function pickContract(S) {
    const team = S.hunters.filter(Engine.hunterAvailable);
    if (!team.length) return null;
    let best = null, bestScore = 0;
    for (const c of S.contracts) {
      // Habitat-Wissen zeigt (wie in der UI) Variante vorab – Unbannbares meiden
      const e0 = c.ghosts[0];
      if (Engine.know(S, e0.id, "habitat") && e0.tier > Engine.allowedTier(S, e0.id)) continue;
      const travel = Engine.travelInfo(S, c.locationId);
      const p = estimateChance(S, c);
      const pay = Engine.payout(S, c);
      let score = p * pay - (1 - p) * c.penalties.failure - travel.cost - 15;
      if (c.invasion) score += 1000;            // HQ verteidigen hat Vorrang
      if (c.expiresDay <= S.day) score += 40;   // läuft heute ab
      if (c.legend && p < 0.5) continue;        // Legende nur mit echter Chance
      if (score > bestScore) { best = c; bestScore = score; }
    }
    return best;
  }

  function pickTeam(S) {
    const avail = S.hunters.filter(Engine.hunterAvailable)
      .sort((a, b) => (Engine.effSkill(b, "rituale") + Engine.effSkill(b, "fallen")) -
                      (Engine.effSkill(a, "rituale") + Engine.effSkill(a, "fallen")));
    const size = Engine.teamSize(S);
    const team = avail.slice(0, size);
    // besten Späher hineintauschen, falls nicht dabei
    const scout = avail.filter((h) => !team.includes(h))
      .sort((a, b) => Engine.effSkill(b, "aufklaerung") - Engine.effSkill(a, "aufklaerung"))[0];
    if (scout && team.length === size &&
        Engine.effSkill(scout, "aufklaerung") > Math.max(...team.map((h) => Engine.effSkill(h, "aufklaerung")))) {
      team[team.length - 1] = scout;
    }
    return team.map((h) => h.id);
  }

  function runEncounter(S, c, rec) {
    if (!Engine.startMission(S, c.id, pickTeam(S))) return;
    rec.missions.started++;
    const M = S.mission;

    // Diagnose: günstige/gratis Kanäle zuerst
    const loc = Engine.loc(c.locationId);
    const freeAudio = M.envTags.includes("echoey") || S.inventory["audio2"];
    const order = freeAudio ? ["audio", "visuell", "thermo", "emf"] : ["visuell", "thermo", "audio", "emf"];
    const channels = Engine.availableChannels(S);
    for (const ch of order) {
      if (!channels.includes(ch)) continue;
      Engine.scan(S, ch);
    }

    // Konter-Gewichte aus Verdächtigen + Beobachtungen + Hinweisen
    const w = {};
    const suspects = Engine.suspects(S);
    for (const s of suspects) {
      const weight = 1 / (1 + s.unexplained);
      for (const t of s.ghost.traits) {
        const m = DATA.TRAITS[t].counter;
        if (m) w[m] = (w[m] || 0) + weight;
      }
    }
    if (!suspects.length) { // Anomalie o.ä.: direkt aus den Spuren ableiten
      for (const o of M.observed) {
        for (const t of (o.options || [])) {
          const m = DATA.TRAITS[t].counter;
          if (m) w[m] = (w[m] || 0) + 1 / o.options.length;
        }
      }
    }
    for (const f of M.freeTells) {
      const m = DATA.TRAITS[f.trait].counter;
      if (m) w[m] = (w[m] || 0) + 1.5;
    }
    Engine.toPreparation(S);
    const { hintedMethods } = Engine.prepHints(S);
    for (const m of Object.keys(hintedMethods)) w[m] = (w[m] || 0) + 2;

    // Platzieren: pro Methode höchstens einmal, langlebige Geräte zuerst
    const ranked = Object.entries(w).sort((a, b) => b[1] - a[1]).map(([m]) => m);
    const maxP = Engine.maxPlacements(S);
    let placed = 0;
    for (const m of ranked) {
      if (placed >= maxP) break;
      const opts = Engine.placementOptions(S)
        .filter((o) => o.method === m && Engine.chargesLeft(S, o.equipId) > 0)
        .sort((a, b) => (Engine.chargesLeft(S, b.equipId) === Infinity ? 1 : 0) - (Engine.chargesLeft(S, a.equipId) === Infinity ? 1 : 0));
      if (opts.length && Engine.togglePlacement(S, opts[0].equipId, opts[0].method)) {
        rec.methods[m] = (rec.methods[m] || 0) + 1;
        placed++;
      }
    }

    // Entscheidung anhand der Prognose (wie sie die UI zeigt)
    const pv = Engine.executionPreview(S);
    if (pv.lockedVariant && !c.invasion) { Engine.abortMission(S); rec.missions.locked++; rec.missions.abort++; return; }
    if (pv.chance < 0.33 && !c.invasion) { Engine.abortMission(S); rec.missions.abort++; return; }

    const R = Engine.execute(S);
    rec.chanceSum += pv.chance; rec.chanceN++;
    const bucket = Math.min(9, Math.floor((S.day - 1) / 10));
    if (R.success) {
      rec.missions.success++;
      rec.bucketS[bucket]++;
      if (!R.collateral) rec.missions.clean++;
    } else {
      rec.missions.fail++;
      rec.bucketF[bucket]++;
    }
    if (c.invasion) rec.missions.invasions++;
    if (Engine.isAnomaly(c.ghosts[0].id)) rec.missions.anomalies++;
    if (c.ghosts.some((e) => e.tier >= 2)) rec.missions.variants++;
    rec.injuries += R.injuries.length;
    Engine.finishMission(S);
  }

  // ------------------------------------------------------------- Tagesplan
  function playDay(S, rec) {
    handleEvent(S, rec);
    sellLoot(S);
    study(S, rec);
    shop(S, rec);
    const c = pickContract(S);
    if (c) runEncounter(S, c, rec);
    else rec.restDays++;
  }

  return { playDay };
}

module.exports = { createAgent };

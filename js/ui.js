// GhostHQ UI – rendert den Spielzustand S und leitet Aktionen an die Engine.
// Grafik (Karte, HQ, Szene, Sprites) kommt aus gfx.js und wird nach jedem
// Render-Durchlauf auf die Canvas-Elemente gezeichnet.
"use strict";

let S = null;
const UI = { tab: "karte", teamPick: null, showNewGame: false, mapSel: null };

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmt(n) { return Math.round(n).toLocaleString("de-DE"); }
function pct(x) { return Math.round(x * 100) + " %"; }
function sprImg(ghostId, tier = 0, px = 4) {
  if (typeof Gfx === "undefined") return "";
  return `<img class="spr" alt="" src="${Gfx.ghostSprite(ghostId, tier, px).toDataURL()}">`;
}

// ------------------------------------------------------------------ Aktionen
UI.setTab = (t) => { UI.tab = t; render(); };
UI.nextDay = () => { Engine.nextDay(S); Engine.save(S); render(); };
UI.upgradeRoom = (id) => { Engine.upgradeRoom(S, id); Engine.save(S); render(); };
UI.buy = (id) => { Engine.buyEquipment(S, id); Engine.save(S); render(); };
UI.refill = (id) => { Engine.refill(S, id); Engine.save(S); render(); };
UI.hire = (i) => { Engine.hire(S, i); Engine.save(S); render(); };
UI.fire = (id) => { if (confirm("Wirklich entlassen?")) { Engine.fire(S, id); Engine.save(S); render(); } };
UI.sellLoot = (i) => { Engine.sellLoot(S, i); Engine.save(S); render(); };
UI.study = (gid) => { Engine.study(S, gid); Engine.save(S); render(); };
UI.selectLoc = (locId) => { UI.mapSel = UI.mapSel === locId ? null : locId; render(); };
UI.buyBook = (id) => { Engine.buyBook(S, id); Engine.save(S); render(); };
UI.craftWard = (m) => { Engine.craftWard(S, m); Engine.save(S); render(); };
UI.craftMod = (id) => { Engine.craftMod(S, id); Engine.save(S); render(); };
UI.buyGrid = (id) => { Engine.buyGrid(S, id); Engine.save(S); render(); };
UI.retire = (id) => { if (confirm("In den Ruhestand verabschieden? Das Vermächtnis stärkt künftige Bewerbungen.")) { Engine.retire(S, id); Engine.save(S); render(); } };
UI.resolveEvent = (choice) => { Engine.resolveEvent(S, choice); Engine.save(S); render(); };

UI.openTeamPick = (contractId) => { UI.teamPick = { contractId, selected: [] }; render(); };
UI.cancelTeamPick = () => { UI.teamPick = null; render(); };
UI.toggleMember = (hid) => {
  const sel = UI.teamPick.selected;
  const i = sel.indexOf(hid);
  if (i >= 0) sel.splice(i, 1);
  else if (sel.length < Engine.teamSize(S)) sel.push(hid);
  render();
};
UI.launchMission = () => {
  if (Engine.startMission(S, UI.teamPick.contractId, UI.teamPick.selected)) {
    UI.teamPick = null;
    Engine.save(S);
  }
  render();
};

UI.scan = (channel) => { Engine.scan(S, channel); Engine.save(S); render(); };
UI.toPrep = () => { Engine.toPreparation(S); Engine.save(S); render(); };
UI.togglePlacement = (equipId, method) => { Engine.togglePlacement(S, equipId, method); render(); };
UI.execute = () => { Engine.execute(S); Engine.save(S); render(); };
UI.abortMission = () => { Engine.abortMission(S); Engine.save(S); render(); };
UI.finishMission = () => { Engine.finishMission(S); Engine.save(S); render(); };

UI.newGamePrompt = () => { UI.showNewGame = true; render(); };
UI.cancelNewGame = () => { UI.showNewGame = false; render(); };
UI.startNewGame = () => {
  const seed = document.getElementById("seed-input").value;
  const tutEl = document.getElementById("tutorial-input");
  Engine.clearSave();
  S = Engine.newGame(seed, { tutorial: !!(tutEl && tutEl.checked) });
  UI.showNewGame = false; UI.tab = "karte"; UI.teamPick = null; UI.mapSel = null;
  Engine.save(S);
  render();
};

// ------------------------------------------------------------------- Header
function renderHeader() {
  const veilClass = S.schleier >= 70 ? "bad" : S.schleier >= 40 ? "warn" : "good";
  const w = DATA.WEATHER[S.weather];
  return `
  <header>
    <div class="logo">👻 Ghost<span>HQ</span></div>
    <div class="stats">
      <div class="stat"><label>Tag</label><b>${S.day}</b></div>
      <div class="stat" title="${esc(w.hint)}"><label>Wetter</label><b>${w.icon} ${esc(w.name)}</b></div>
      <div class="stat"><label>Ätherkredite</label><b class="${S.money < 0 ? "bad" : ""}">${fmt(S.money)} ÄK</b></div>
      <div class="stat"><label>Reputation</label><b>${S.rep}/100</b></div>
      <div class="stat veil"><label>Schleierdruck</label>
        <div class="bar"><div class="fill ${veilClass}" style="width:${S.schleier}%"></div></div><b>${S.schleier}</b>
      </div>
    </div>
    <div class="header-actions">
      ${S.flags.tutorialActive ? `<span class="tutorial-badge" title="Tage 1–5: Schonfrist mit Volloffenlegung. Ab Tag 6 gilt der Ernstfall.">🎓 Tutorial (bis Tag 5)</span>` : ""}
      <button class="primary" onclick="UI.nextDay()" ${S.mission || S.pendingEvent || S.flags.lost ? "disabled" : ""}>Nächster Tag ▸</button>
      <button onclick="UI.newGamePrompt()">Neues Spiel</button>
    </div>
  </header>
  <nav>
    ${["karte|Stadtkarte", "zentrale|Zentrale", "team|Team", "ausruestung|Ausrüstung", "grimoire|Grimoire"].map((t) => {
      const [id, label] = t.split("|");
      const badge = id === "karte" ? ` <span class="badge">${S.contracts.length}</span>` : "";
      return `<button class="tab ${UI.tab === id ? "active" : ""}" onclick="UI.setTab('${id}')">${label}${badge}</button>`;
    }).join("")}
  </nav>`;
}

// ---------------------------------------------------------------- Stadtkarte
function contractCard(c, compact = false) {
  const loc = Engine.loc(c.locationId);
  const d = Engine.district(S, c.districtId);
  const pay = Engine.payout(S, c);
  const travel = Engine.travelInfo(S, loc.id);
  const mods = c.modifiers.map((m) => ({
    publicPlace: "Öffentlicher Ort", rush: "Eilauftrag", multipleEntities: "Mehrere Entitäten", noCollateral: "Kein Kollateral!",
  }[m])).filter(Boolean);
  const tags = Engine.effectiveEnv(S, loc).map((t) =>
    `<span class="tag ${loc.environmentTags.includes(t) ? "" : "weather-tag"}" title="${esc(DATA.ENV_TAG_INFO[t].hint)}">${esc(DATA.ENV_TAG_INFO[t].name)}${loc.environmentTags.includes(t) ? "" : " (instabil)"}</span>`).join("");
  const threat = "☠".repeat(Math.min(6, Math.ceil(c.threatEstimate / 2))) || "☠";

  // Grimoire „Habitat“: verrät, wer vermutlich dahintersteckt
  let suspicion = "";
  const e0 = c.ghosts[0];
  if (!c.legend && Engine.know(S, e0.id, "habitat")) {
    const lockWarn = e0.tier > Engine.allowedTier(S, e0.id)
      ? ` <span class="bad">⚠ Diese Variante übersteigt euer Wissen!</span>` : "";
    const exact = Engine.know(S, e0.id, "gefahr") ? ` · Gefahr exakt: ${Engine.contractDanger(c)}` : "";
    suspicion = `<p class="suspicion">${sprImg(e0.id, e0.tier, 3)} Grimoire-Vermutung: <b>${esc(Engine.ghostDisplayName(e0))}</b>${exact}${lockWarn}</p>`;
  }
  const rushWarn = c.modifiers.includes("rush") && travel.far
    ? `<p class="warn small">⚠ Eilauftrag + weite Anfahrt: −1 Scan (späte Ankunft).</p>` : "";

  // Tutorial-Volloffenlegung: Konter direkt auf der Auftragskarte
  let tutorialInfo = "";
  if (S.flags.tutorialActive && !c.legend) {
    const req = Engine.requiredMethods(c);
    tutorialInfo = `<p class="tutorial-hint">🎓 Ausbilderin: Diese Entität erfordert <b>${req.map((m) => esc(DATA.METHODS[m].name)).join(" + ")}</b>.</p>`;
  }
  const anom = Engine.isAnomaly(c.ghosts[0].id);

  return `<div class="card contract ${c.legend ? "legend" : ""} ${anom ? "anomaly" : ""} ${c.invasion ? "invasion" : ""}">
    <div class="card-head"><b>${esc(loc.name)}</b><span class="threat" title="Bedrohungseinschätzung ${c.threatEstimate}">${threat}</span></div>
    ${anom ? `<p class="legend-text">🕳 Schleierbruch: Entität nicht im Kodex – reine Deduktion, kein Grimoire-Wissen anwendbar.</p>` : ""}
    ${c.invasion ? `<p class="bad">⚠ INVASION im HQ! Heute verteidigen, sonst wird ein Raum verwüstet.</p>` : ""}
    <p class="dim">${esc(c.client)} · Bezirk ${esc(d.name)} (Schleier ${Math.round(d.veil)}) · läuft ab: Tag ${c.expiresDay === 9999 ? "—" : c.expiresDay}</p>
    <p class="dim small">Anfahrt: ${travel.km} km · −${travel.cost} ÄK${S.weather === "sturm" ? " (Sturm!)" : ""}</p>
    ${compact ? "" : `<div class="tags">${tags}</div>`}
    ${mods.length ? `<div class="mods">${mods.map((m) => `<span class="mod">${esc(m)}</span>`).join("")}</div>` : ""}
    ${suspicion}${rushWarn}${tutorialInfo}
    ${c.guaranteed ? `<p class="dim small">Routineauftrag – sichere Marge für schwere Zeiten.</p>` : ""}
    ${c.legend ? `<p class="legend-text">⚜ Legendärer Auftrag. Der Schleierfürst wartet.</p>` : ""}
    <div class="card-foot">
      <b class="pay">≈ ${fmt(pay)} ÄK</b>
      <button class="primary" ${S.mission || S.flags.lost ? "disabled" : ""} onclick="UI.openTeamPick('${c.id}')">Team entsenden</button>
    </div>
  </div>`;
}

function renderKarte() {
  if (UI.teamPick) return renderTeamPick();
  let banner = "";
  if (S.flags.won) banner = `<div class="banner good">🏆 Der Schleierfürst ist gebannt! Ihr habt die Stadt gerettet. Weiterspielen oder mit neuem Seed neu beginnen.</div>`;
  if (S.flags.lost) banner = `<div class="banner bad">💀 Schleierbruch. Der Schleierdruck hat 100 erreicht – die Stadt ist verloren. Startet ein neues Spiel.</div>`;

  let panel;
  if (UI.mapSel) {
    const loc = Engine.loc(UI.mapSel);
    const d = Engine.districtOfLoc(S, loc.id);
    const travel = Engine.travelInfo(S, loc.id);
    const contracts = S.contracts.filter((c) => c.locationId === loc.id);
    const veilClass = d.veil >= 80 ? "bad" : d.veil >= 50 ? "warn" : "good";
    panel = `
      <h3>${esc(loc.name)}</h3>
      <p class="dim">Bezirk ${esc(d.name)} · ${loc.outdoor ? "Außenlage" : "Innenlage"} · Anfahrt ${travel.km} km (−${travel.cost} ÄK)</p>
      <div class="bar small-bar" title="Lokaler Schleier – bestimmt Varianten-Stärke und Gefahrenzulage">
        <div class="fill ${veilClass}" style="width:${d.veil}%"></div></div>
      <p class="dim small">Lokaler Schleier ${Math.round(d.veil)}: Gefahrenzulage +${Math.round(d.veil / 2)} % Prämie, aber stärkere Varianten.${d.veil >= 80 ? " ⚠ Bezirk kurz vor dem Kippen – Orte mutieren (instabile Umwelt-Tags)!" : ""}</p>
      ${S.grids[d.id]
        ? `<p class="good small">📡 Sensornetz aktiv: kleine Fälle (☠ ≤ 3) werden hier automatisch bearbeitet (60 % Prämie, keine Essenzproben).</p>`
        : d.veil < 30
          ? `<button ${S.money < 300 || S.mission ? "disabled" : ""} onclick="UI.buyGrid('${d.id}')">📡 Sensornetz installieren (300 ÄK) – automatisiert kleine Fälle in ${esc(d.name)}</button>`
          : `<p class="dim small">📡 Sensornetz erst möglich, wenn der Bezirk gesichert ist (Schleier &lt; 30).</p>`}
      <div class="tags">${Engine.effectiveEnv(S, loc).map((t) => `<span class="tag" title="${esc(DATA.ENV_TAG_INFO[t].hint)}">${esc(DATA.ENV_TAG_INFO[t].name)}</span>`).join("")}
        ${loc.hazards.map((h) => `<span class="tag hazard">${esc(DATA.HAZARD_INFO[h].name)}</span>`).join("")}</div>
      ${contracts.length
        ? contracts.map((c) => contractCard(c)).join("")
        : `<p class="dim">Hier liegt derzeit kein Auftrag vor.</p>`}`;
  } else {
    panel = `
      <h3>Einsatzleitung</h3>
      <p class="dim">Klickt einen Ort auf der Karte an. Der violette Dunst zeigt den <b>lokalen Schleier</b> je Bezirk:
      dort locken Gefahrenzulagen, aber es entstehen stärkere Varianten. Verfallene Aufträge verdichten den Schleier des Bezirks;
      Bezirke ab Schleier 80 treiben den globalen Druck zusätzlich.</p>
      <p class="dim">Wetter heute: ${DATA.WEATHER[S.weather].icon} <b>${esc(DATA.WEATHER[S.weather].name)}</b> – ${esc(DATA.WEATHER[S.weather].hint)}</p>
      <h3>Offene Aufträge (${S.contracts.length})</h3>
      ${S.contracts.map((c) => {
        const loc = Engine.loc(c.locationId);
        const marker = c.legend ? "⚜ " : c.invasion ? "⚠ " : Engine.isAnomaly(c.ghosts[0].id) ? "🕳 Schleierbruch: " : "";
        return `<button class="loc-link ${c.legend ? "legend-link" : ""} ${c.invasion ? "invasion-link" : ""}" onclick="UI.selectLoc('${loc.id}')">
          ${marker}${esc(loc.name)} <span class="dim">· ☠${c.threatEstimate} · ≈${fmt(Engine.payout(S, c))} ÄK · Tag ${c.expiresDay === 9999 ? "—" : c.expiresDay}</span>
        </button>`;
      }).join("")}`;
  }

  return `${banner}
  <div class="map-flex">
    <div class="map-wrap"><canvas id="map-canvas"></canvas></div>
    <aside class="map-panel">${panel}</aside>
  </div>
  <p class="dim small">Die Bezahlung folgt P = Basis × (1 + 0,2·Bedrohung + Zuschläge) × RegionMod (lokaler Schleier) × Variantenfaktor × Reputationsfaktor.</p>`;
}

// ------------------------------------------------------------------ Zentrale
function renderZentrale() {
  const rooms = Object.entries(DATA.ROOMS).map(([id, room]) => {
    const cur = S.hq[id];
    const next = room.levels.find((l) => l.level === cur + 1);
    const curInfo = cur > 0 ? room.levels.find((l) => l.level === cur).effect : "Noch nicht gebaut.";
    return `<div class="card room">
      <div class="card-head"><b>${esc(room.name)}</b><span class="lvl">${cur > 0 ? "Stufe " + cur : "—"}</span></div>
      <p>${esc(curInfo)}</p>
      ${next ? `<button ${S.money < next.cost || S.mission ? "disabled" : ""} onclick="UI.upgradeRoom('${id}')">
        ${cur === 0 ? "Bauen" : "Ausbauen"} → Stufe ${next.level} (${fmt(next.cost)} ÄK)</button>
        <p class="dim">${esc(next.effect)}</p>` : `<p class="dim">Maximal ausgebaut.</p>`}
    </div>`;
  }).join("");

  const log = S.log.slice(0, 30).map((e) =>
    `<div class="log-entry ${e.kind}"><span class="log-day">Tag ${e.day}</span> ${esc(e.text)}</div>`).join("");

  return `
  <div class="hq-canvas-wrap"><canvas id="hq-canvas"></canvas></div>
  ${S.schleier >= 50 ? `<p class="dim small">Die violetten Risse im Mauerwerk sind kein Baumangel – der Schleierdruck zeichnet das Haus.</p>` : ""}
  <div class="cols">
    <section>
      <h2>Hauptquartier</h2>
      <div class="grid">${rooms}</div>
    </section>
    <section>
      <h2>Funkprotokoll</h2>
      <div class="log">${log || '<div class="dim">Noch keine Einträge.</div>'}</div>
      <p class="dim small">Gebannt: ${S.stats.banished} · Gescheitert: ${S.stats.failed} · Saubere Serie: ${S.stats.cleanStreak} · Seed: ${esc(S.seed)}</p>
    </section>
  </div>`;
}

// -------------------------------------------------------------- Teamauswahl
function renderTeamPick() {
  const c = S.contracts.find((x) => x.id === UI.teamPick.contractId);
  if (!c) { UI.teamPick = null; return renderKarte(); }
  const loc = Engine.loc(c.locationId);
  const travel = Engine.travelInfo(S, loc.id);
  const max = Engine.teamSize(S);
  const rows = S.hunters.map((h) => {
    const avail = Engine.hunterAvailable(h);
    const sel = UI.teamPick.selected.includes(h.id);
    const status = h.injury === "serious" ? `verletzt (${h.injuryDays} T.)` : h.stress >= 80 ? "ausgebrannt" : h.injury === "light" ? "angeschlagen" : "bereit";
    return `<label class="pick-row ${avail ? "" : "unavailable"} ${sel ? "selected" : ""}">
      <input type="checkbox" ${sel ? "checked" : ""} ${avail ? "" : "disabled"} onchange="UI.toggleMember('${h.id}')">
      <b>${esc(h.name)}</b> <span class="dim">${esc(DATA.CLASSES[h.class].name)} · Lv ${h.level}</span>
      <span class="dim">${skillLine(h)}</span>
      <span class="status ${avail ? "ok" : "bad"}">${status}${h.stress > 0 ? " · Stress " + h.stress : ""}</span>
    </label>`;
  }).join("");
  return `<section>
    <h2>Team für: ${esc(loc.name)}</h2>
    <p class="dim">Anfahrt: ${travel.km} km (−${travel.cost} ÄK, wird bei Einsatzbeginn fällig). Bis zu ${max} Jäger:innen.
    Aufklärung = mehr &amp; klarere Scans (auch „mit bloßen Sinnen“), Fallen/Rituale = bessere Ausführung, Sicherheit = weniger Verletzungen, Forschung = Grimoire-Studien.</p>
    <div class="pick-list">${rows}</div>
    <div class="btn-row">
      <button class="primary" ${UI.teamPick.selected.length === 0 ? "disabled" : ""} onclick="UI.launchMission()">Einsatz starten (${UI.teamPick.selected.length}/${max})</button>
      <button onclick="UI.cancelTeamPick()">Zurück</button>
    </div>
  </section>`;
}

function skillLine(h) {
  return Object.entries(h.skills).filter(([, v]) => v > 0)
    .map(([k, v]) => `${DATA.SKILL_NAMES[k].slice(0, 4)} ${v}`).join(" · ");
}

// ---------------------------------------------------------------------- Team
function quirkBadge(quirkId) {
  if (!quirkId) return "";
  const q = DATA.QUIRKS.find((x) => x.id === quirkId);
  return q ? `<span class="tag quirk ${q.delta > 0 ? "quirk-good" : "quirk-bad"}" title="${esc(q.desc)}">${q.delta > 0 ? "☆" : "⚠"} ${esc(q.name)}</span>` : "";
}

function renderTeam() {
  const rows = S.hunters.map((h) => {
    const status = h.injury === "serious" ? `Schwer verletzt (${h.injuryDays} Tage)` : h.injury === "light" ? `Leicht verletzt (${h.injuryDays} Tage, −1 auf alles)` : h.stress >= 80 ? "Ausgebrannt (Stress ≥ 80)" : "Einsatzbereit";
    return `<div class="card hunter">
      <div class="card-head"><b>${esc(h.name)}</b><span class="lvl">Lv ${h.level} · ${esc(DATA.CLASSES[h.class].name)}</span></div>
      <p>${skillLine(h)} ${quirkBadge(h.quirk)}</p>
      <div class="bar small-bar" title="Stress"><div class="fill ${h.stress >= 80 ? "bad" : h.stress >= 50 ? "warn" : "good"}" style="width:${h.stress}%"></div></div>
      <p class="dim small">Stress ${h.stress}/100 · XP ${h.xp}/${h.level * 10} · Lohn ${h.wage} ÄK/Tag · ${status}</p>
      <div class="btn-row">
        <button class="danger" ${S.hunters.length <= 1 || S.mission ? "disabled" : ""} onclick="UI.fire('${h.id}')">Entlassen</button>
        ${h.level >= 5 ? `<button ${S.hunters.length <= 1 || S.mission ? "disabled" : ""} title="Vererbt ${esc(DATA.SKILL_NAMES[DATA.CLASSES[h.class].primary])} +1 an künftige Bewerbungen" onclick="UI.retire('${h.id}')">🏅 Ruhestand</button>` : ""}
      </div>
    </div>`;
  }).join("");

  const cands = S.candidates.map((c, i) => `<div class="card">
    <div class="card-head"><b>${esc(c.name)}</b><span class="lvl">${esc(DATA.CLASSES[c.class].name)}</span></div>
    <p class="dim">Lohn: ${c.wage} ÄK/Tag · Antrittsprämie: ${c.fee} ÄK</p>
    <p>${quirkBadge(c.quirk)}
      ${(c.legacies || []).map((l) => `<span class="tag legacy" title="Vermächtnis von ${esc(l.from)}">🏅 ${esc(DATA.SKILL_NAMES[l.skill])} +1</span>`).join(" ")}</p>
    <button ${S.money < c.fee || S.mission ? "disabled" : ""} onclick="UI.hire(${i})">Einstellen</button>
  </div>`).join("");

  const legacyInfo = S.legacyPerks.length
    ? `<p class="dim small">Vermächtnisse: ${S.legacyPerks.map((l) => `${esc(l.from)} (${esc(DATA.SKILL_NAMES[l.skill])})`).join(", ")} – die letzten zwei prägen jede neue Bewerbung.</p>`
    : "";

  return `<div class="cols">
    <section><h2>Roster (${S.hunters.length})</h2><div class="grid">${rows}</div>
    <p class="dim small">Ab Stufe 5 können Jäger:innen in den Ruhestand gehen und ihr Können an den Bewerbungspool vererben.</p></section>
    <section><h2>Bewerbungen</h2><p class="dim">Neuer Pool alle 7 Tage.</p>${legacyInfo}<div class="grid">${cands || '<p class="dim">Derzeit keine Bewerbungen.</p>'}</div></section>
  </div>`;
}

// ----------------------------------------------------------------- Ausrüstung
function renderAusruestung() {
  const tierCap = Engine.equipmentTierCap(S);
  const shop = DATA.EQUIPMENT.filter((e) => !S.inventory[e.id] && !e.craftOnly).map((e) => {
    const prev = DATA.EQUIPMENT.find((x) => x.upgradesTo === e.id);
    const needsPrev = prev && !S.inventory[prev.id];
    const locked = e.tier > tierCap;
    const superseded = e.upgradesTo && (S.inventory[e.upgradesTo] || DATA.EQUIPMENT.some((x) => x.id === e.upgradesTo && S.inventory[x.upgradesTo]));
    if (superseded) return "";
    let note = "";
    if (locked) note = `Benötigt Werkstatt ${e.tier === 2 ? "Stufe 1" : "Stufe 2"}.`;
    else if (needsPrev) note = `Benötigt zuerst: ${prev.name}.`;
    return `<div class="card">
      <div class="card-head"><b>${esc(e.name)}</b><span class="lvl">T${e.tier}</span></div>
      <p class="dim">${esc(e.desc)}</p>
      ${e.counters.length ? `<div class="tags">${e.counters.map((m) => `<span class="tag">${esc(DATA.METHODS[m].name)}</span>`).join("")}</div>` : ""}
      ${note ? `<p class="dim small">🔒 ${esc(note)}</p>` : ""}
      <button ${locked || needsPrev || S.money < e.price || S.mission ? "disabled" : ""} onclick="UI.buy('${e.id}')">Kaufen (${fmt(e.price)} ÄK)</button>
    </div>`;
  }).join("");

  const inv = Object.keys(S.inventory).map((id) => {
    const e = Engine.eq(id);
    const item = S.inventory[id];
    const max = Engine.maxCharges(S, e);
    const charge = e.charges !== null ? `<p>Ladungen: <b>${item.charges}/${max}</b>${S.mods[id] ? ' <span class="good small">(Labor-Mod +1)</span>' : ""} ${e.refillPrice && item.charges < max ? `<button class="inline" ${S.money < e.refillPrice ? "disabled" : ""} onclick="UI.refill('${id}')">Auffüllen (${e.refillPrice} ÄK)</button>` : ""}</p>` : "";
    return `<div class="card">
      <div class="card-head"><b>${esc(e.name)}</b><span class="lvl">T${e.tier}</span></div>
      <p class="dim">${esc(e.desc)}</p>
      ${e.counters.length ? `<div class="tags">${e.counters.map((m) => `<span class="tag">${esc(DATA.METHODS[m].name)}</span>`).join("")}</div>` : ""}
      ${charge}
    </div>`;
  }).join("");

  const stash = S.stash.map((item, i) => `<div class="loot-row">
    <span class="rarity ${item.rarity}">${item.rarity}</span> <b>${esc(item.name)}</b>
    <span class="dim">(${item.type === "essence" ? "Essenz" : "Artefakt"})</span>
    <button class="inline" onclick="UI.sellLoot(${i})">Verkaufen (+${fmt(Engine.lootValue(S, item))} ÄK)</button>
  </div>`).join("");

  // Bibliothek: Fachbücher als Wirtschafts-Sink und Hinweis-Quelle
  const essCount = Engine.essenceCount(S);
  const books = DATA.LIBRARY.map((b) => {
    const owned = S.library.includes(b.id);
    const affordable = S.money >= b.price && essCount >= b.essences;
    return `<div class="card ${owned ? "owned-book" : ""}">
      <div class="card-head"><b>📖 ${esc(b.name)}</b>${owned ? '<span class="good">✓ im Regal</span>' : ""}</div>
      <p class="dim small">${esc(b.desc)}</p>
      <div class="tags">${b.methods.map((m) => `<span class="tag">${esc(DATA.METHODS[m].name)}</span>`).join("")}</div>
      ${owned ? "" : `<button ${affordable && !S.mission ? "" : "disabled"} onclick="UI.buyBook('${b.id}')">
        Kaufen (${fmt(b.price)} ÄK + ${b.essences} Essenzen)</button>`}
    </div>`;
  }).join("");

  // Labor-Schmiede: Wards und permanente Mods
  let crafting = "";
  if (S.hq.labor >= 1) {
    const wards = Object.keys(DATA.METHODS).map((m) => {
      const e = Engine.eq("ward_" + m);
      const item = S.inventory[e.id];
      const cur = item ? item.charges : 0;
      const full = cur >= Engine.maxCharges(S, e);
      return `<button class="craft-btn" ${S.money >= 40 && essCount >= 3 && !full && !S.mission ? "" : "disabled"}
        title="${esc(e.desc)}" onclick="UI.craftWard('${m}')">⚗ ${esc(DATA.METHODS[m].name)}-Ward ${cur ? `(${cur}/3)` : ""}</button>`;
    }).join("");
    const modTargets = ["salz", "tuecher", "sigill"].filter((id) => S.inventory[id] && !S.mods[id]);
    const mods = modTargets.map((id) => {
      const e = Engine.eq(id);
      return `<button class="craft-btn" ${S.money >= 100 && essCount >= 4 && !S.mission ? "" : "disabled"}
        onclick="UI.craftMod('${id}')">🔧 ${esc(e.name)}: +1 Kapazität (100 ÄK + 4 Essenzen)</button>`;
    }).join("");
    crafting = `<h2>Labor-Schmiede</h2>
      <p class="dim small">Essenzen im Lager: <b>${essCount}</b>. Wards (40 ÄK + 3 Essenzen) wirken einmalig als Konter – die Notlösung, wenn das Gerät fehlt.</p>
      <div class="craft-grid">${wards}</div>
      ${mods ? `<p class="dim small">Permanente Modifikationen:</p><div class="craft-grid">${mods}</div>` : ""}`;
  }

  return `<div class="cols">
    <section><h2>Inventar</h2><div class="grid">${inv || '<p class="dim">Leer.</p>'}</div>
      <h2>Beute</h2>${stash || '<p class="dim">Keine Beute im Lager. Labor und Grimoire-Wissen steigern die Werte.</p>'}</section>
    <section><h2>Händler</h2><p class="dim">Tier-2/3-Geräte erfordern Werkstatt-Ausbau.</p><div class="grid">${shop || '<p class="dim">Alles gekauft!</p>'}</div>
      <h2>Bibliothek</h2><p class="dim small">Fachbücher markieren passende Konter im Einsatz mit 📖 (Kosten: ÄK + beliebige Essenzen).</p>
      <div class="grid">${books}</div>
      ${crafting}</section>
  </div>`;
}

// ------------------------------------------------------------------ Grimoire
function renderGrimoire() {
  const studied = DATA.GHOSTS.filter((g) => S.grimoire[g.id] || S.codexSeen[g.id]);
  const studyCards = studied.map((g) => {
    const grim = S.grimoire[g.id] || { specimens: 0, points: 0, unlocked: [] };
    const next = DATA.KNOWLEDGE.find((k) => !grim.unlocked.includes(k.id));
    const chk = Engine.canStudy(S, g.id);
    const unlockedHtml = grim.unlocked.map((uid) => {
      const k = DATA.KNOWLEDGE.find((x) => x.id === uid);
      return `<details class="know"><summary>✦ ${esc(k.name)}</summary>
        <p class="dim small">${esc(k.lore.replace("{name}", g.name))}</p>
        <p class="small good">${esc(k.effect)}</p></details>`;
    }).join("");
    const progress = next ? Math.min(100, Math.round(grim.points / next.cost * 100)) : 100;
    return `<div class="card grim-card">
      <div class="card-head">${sprImg(g.id, 0, 4)}<b>${esc(g.name)}</b><span class="lvl">${grim.unlocked.length}/${DATA.KNOWLEDGE.length} Erkenntnisse</span></div>
      <p class="dim small">Essenzproben: <b>${grim.specimens}</b> · Erkenntnis: ${grim.points}${next ? "/" + next.cost : ""} Punkte</p>
      <div class="bar small-bar"><div class="fill good" style="width:${progress}%"></div></div>
      ${next ? `<p class="small">Nächste Erkenntnis: <b>${esc(next.name)}</b> <span class="dim">– ${esc(next.effect)}</span></p>` : `<p class="good small">Vollständig erforscht – Meisterschaft erreicht.</p>`}
      ${unlockedHtml || '<p class="dim small">Noch keine Erkenntnisse. Bannt den Geist und studiert die Essenzproben.</p>'}
      ${next ? `<button ${chk.ok ? "" : "disabled"} title="${chk.ok ? "" : esc(chk.why)}" onclick="UI.study('${g.id}')">
        Probe studieren ${chk.ok ? `(+${chk.points} Punkte, ${esc(chk.researcher.name)})` : `– ${esc(chk.why)}`}</button>` : ""}
    </div>`;
  }).join("");

  const kodexCards = DATA.GHOSTS.map((g) => {
    const seen = S.codexSeen[g.id];
    const f = DATA.FACTIONS[g.factionId];
    const traits = g.traits.map((t) => {
      const def = DATA.TRAITS[t];
      const counter = def.counter ? DATA.METHODS[def.counter].name : (def.envBoost ? `Umgebung: ${DATA.ENV_TAG_INFO[def.envBoost].name}` : "—");
      let tell = def.tell ? `${DATA.CHANNELS[def.channel]}: ${def.tell}` : "passiv";
      const marks = [];
      if (def.tell && !def.senses) marks.push("🔧 nur mit Werkzeug");
      if (def.confusableWith) marks.push(`⚠ verwechselbar mit ${DATA.TRAITS[def.confusableWith].name}`);
      return `<tr><td>${esc(def.name)}</td><td class="dim">${esc(tell)}${marks.length ? `<br><span class="small warn">${marks.join(" · ")}</span>` : ""}</td><td>${esc(counter)}</td></tr>`;
    }).join("");
    return `<div class="card kodex ${seen ? "seen" : ""}">
      <div class="card-head">${sprImg(g.id, 0, 3)}<b>${seen ? "✓ " : ""}${esc(g.name)}</b><span class="lvl">${DATA.RANK_NAMES[g.rank]} · ☠${g.dangerRating}</span></div>
      <p class="dim">${esc(f.name)} – ${esc(f.theme)}</p>
      <div class="table-wrap"><table><thead><tr><th>Eigenschaft</th><th>Spur</th><th>Konter</th></tr></thead><tbody>${traits}</tbody></table></div>
      <p class="dim small">${esc(g.notes)}</p>
    </div>`;
  }).join("");

  return `<section>
    <h2>Grimoire – Studien</h2>
    <p class="dim">Jede Bannung liefert <b>Essenzproben</b>. Im Archiv kann pro Tag eine Probe studiert werden (Forschungs-Skill zählt).
    Erkenntnisse machen einen Typ leichter fangbar – und schalten <b>Uralte</b> und <b>Schleiernahe</b> Varianten überhaupt erst frei.
    ${S.hq.archiv < 1 ? '<span class="warn">⚠ Ohne Archiv sind keine Studien möglich – baut eines in der Zentrale.</span>' : ""}</p>
    <div class="grid grim-grid">${studyCards || '<p class="dim">Noch keine Begegnungen. Das Grimoire füllt sich mit jeder Bannung.</p>'}</div>
    <h2>Kodex (Feldhandbuch)</h2>
    <p class="dim">Basiswissen der Zunft: Spuren und Konter der Grundformen. Varianten tragen zusätzliche, fremde Eigenschaften!</p>
    <div class="grid kodex-grid">${kodexCards}</div>
  </section>`;
}

// ============================================================ EINSATZ-OVERLAY
function renderMission() {
  const M = S.mission;
  const c = Engine.missionContract(S);
  const loc = Engine.loc(c.locationId);
  const team = Engine.missionTeam(S);

  const phases = ["diagnose", "vorbereitung", "nachwirkung"];
  const phaseNames = { diagnose: "1 · Diagnose", vorbereitung: "2 · Vorbereitung & Ausführung", nachwirkung: "3 · Nachwirkung" };
  const stepper = phases.map((p) =>
    `<span class="step ${M.phase === p ? "active" : ""}">${phaseNames[p]}</span>`).join('<span class="step-sep">→</span>');

  let body = "";
  if (M.phase === "diagnose") body = renderDiagnose(M, c, loc);
  else if (M.phase === "vorbereitung") body = renderVorbereitung(M, c, loc);
  else body = renderNachwirkung(M, c, loc);

  // Tutorial-Phase: bernsteinfarbene Anleitung, phasenspezifisch
  let tutorialBox = "";
  if (S.flags.tutorialActive && M.phase !== "nachwirkung") {
    const req = Engine.requiredMethods(c);
    const phaseTip = M.phase === "diagnose"
      ? "Scannt die Kanäle und vergleicht die Spuren mit den Verdächtigen rechts. „Keine Auffälligkeiten“ schließt Geister aus!"
      : "Setzt die unten grün markierten Konter – in der Schonfrist verraten wir sie euch noch.";
    tutorialBox = `<div class="tutorial-box">🎓 <b>Tutorial (Tag ${S.day}/5):</b> ${phaseTip}<br>
      Benötigte Konter: <b>${req.map((m) => esc(DATA.METHODS[m].name)).join(" + ")}</b></div>`;
  }

  return `<div class="mission-overlay"><div class="mission">
    <div class="scene-wrap"><canvas id="scene-canvas"></canvas></div>
    <div class="mission-head">
      <h2>📍 ${esc(loc.name)}</h2>
      <p class="dim">Team: ${team.map((h) => esc(h.name)).join(", ")} · Umgebung:
        ${M.envTags.map((t) => `<span class="tag" title="${esc(DATA.ENV_TAG_INFO[t].hint)}">${esc(DATA.ENV_TAG_INFO[t].name)}</span>`).join(" ")}
        ${loc.hazards.map((h) => `<span class="tag hazard">${esc(DATA.HAZARD_INFO[h].name)}</span>`).join(" ")}
      </p>
      <div class="stepper">${stepper}</div>
    </div>
    ${tutorialBox}
    ${body}
  </div></div>`;
}

function observedHtml(M) {
  const parts = [];
  for (const f of M.freeTells) {
    const def = DATA.TRAITS[f.trait];
    parts.push(`<div class="tell intel">📜 ${esc(f.source)}: „${esc(def.tell)}“ (${DATA.CHANNELS[def.channel]})</div>`);
  }
  if (M.factionHint) {
    parts.push(`<div class="tell intel">📜 Fraktionshinweis: ${esc(DATA.FACTIONS[M.factionHint].name)}</div>`);
  }
  for (const o of M.observed) {
    const ch = DATA.CHANNELS[o.channel] || o.channel;
    if (o.kind === "jammed") parts.push(`<div class="tell jammed">⚡ ${ch}: ${esc(o.text)}</div>`);
    else if (o.kind === "obscured") parts.push(`<div class="tell obscured">🌫 ${ch}: ${esc(o.text)}</div>`);
    else if (o.kind === "none") parts.push(`<div class="tell empty">◌ ${ch}: ${esc(o.text)}</div>`);
    else if (o.kind === "ambiguous") parts.push(`<div class="tell ambiguous">❓ ${ch}: ${esc(o.text)}</div>`);
    else parts.push(`<div class="tell">▣ ${ch}: ${esc(o.text)}</div>`);
  }
  return parts.join("") || '<p class="dim">Noch keine Messungen.</p>';
}

function renderDiagnose(M, c, loc) {
  const channels = Engine.availableChannels(S);
  const btns = ["emf", "thermo", "audio", "visuell"].map((ch) => {
    const owned = channels.includes(ch);
    const done = !!M.scannedChannels[ch];
    const free = ch === "audio" && (M.envTags.includes("echoey") || S.inventory["audio2"]);
    const label = ch === "visuell" ? "Rundgang (bloße Sinne)" : `${DATA.CHANNELS[ch]}-Scan`;
    const canScan = owned && !done && (free || M.scansLeft > 0);
    return `<button ${canScan ? "" : "disabled"} onclick="UI.scan('${ch}')">
      ${done ? "✓ " : ""}${label}${free ? " (gratis)" : ""}${owned ? "" : " – kein Gerät"}</button>`;
  }).join("");

  const suspects = Engine.suspects(S);
  const multi = c.modifiers.includes("multipleEntities");
  const suspectList = suspects.map((s) => {
    const g = s.ghost;
    const extra = s.unexplained > 0 ? `<span class="warn small"> +${s.unexplained} unerklärte Spur(en) → Variante oder zweite Entität?</span>` : "";
    return `<div class="suspect">${sprImg(g.id, 0, 3)}<b>${esc(g.name)}</b> <span class="dim">${DATA.RANK_NAMES[g.rank]} · ${esc(DATA.FACTIONS[g.factionId].name)} · ☠${g.dangerRating}</span>${extra}</div>`;
  }).join("");

  return `<div class="mission-body">
    <div class="mission-cols">
      <div>
        <h3>Sensorik <span class="dim">(Scans übrig: ${M.scansLeft})</span></h3>
        <div class="btn-col">${btns}</div>
        <p class="dim small">Hohe Aufklärung liest Spuren klarer und erspürt beim Rundgang auch Nicht-Sichtbares.
        Werkzeug-exklusive Spuren (EMF, Schattenformen) bleiben bloßen Sinnen verborgen.</p>
        <h3>Beobachtungen</h3>
        <div class="tells">${observedHtml(M)}</div>
      </div>
      <div>
        <h3>Verdächtige laut Kodex ${multi ? '<span class="mod">Mehrere Entitäten!</span>' : ""}</h3>
        <p class="dim small">❓-Berichte sind mehrdeutig – Fehldeutung führt zu falschen Kontern.
        ${multi ? "Die Spuren mehrerer Entitäten überlagern sich." : ""}</p>
        <div class="suspects">${Engine.isAnomaly(c.ghosts[0].id)
          ? `<div class="tell obscured">🕳 Diese Signatur passt zu <b>keinem</b> Kodex-Eintrag. Kombiniert die Spuren direkt mit den Kontern aus dem Feldhandbuch – Grimoire-Wissen greift hier nicht.</div>`
          : (suspectList || '<p class="dim">Keine Übereinstimmung – prüft die Messungen erneut.</p>')}</div>
      </div>
    </div>
    <div class="btn-row">
      <button class="primary" onclick="UI.toPrep()">Weiter zur Vorbereitung ▸</button>
      <button class="danger" onclick="UI.abortMission()">Rückzug (Auftrag bleibt offen)</button>
    </div>
  </div>`;
}

function renderVorbereitung(M, c, loc) {
  const opts = Engine.placementOptions(S);
  const max = Engine.maxPlacements(S);
  const { hints, hintedMethods } = Engine.prepHints(S);
  const rows = opts.map((o) => {
    const e = Engine.eq(o.equipId);
    const m = DATA.METHODS[o.method];
    const active = M.placements.some((p) => p.equipId === o.equipId && p.method === o.method);
    const charges = Engine.chargesLeft(S, o.equipId);
    const chargeInfo = charges === Infinity ? "" : ` · ${charges} Ladung(en)`;
    const disabled = !active && (M.placements.length >= max || charges <= 0);
    const hintSrc = hintedMethods[o.method];
    return `<label class="pick-row ${active ? "selected" : ""} ${disabled ? "unavailable" : ""} ${hintSrc ? "hinted" : ""}">
      <input type="checkbox" ${active ? "checked" : ""} ${disabled ? "disabled" : ""}
        onchange="UI.togglePlacement('${o.equipId}','${o.method}')">
      <b>${hintSrc ? `<span class="hint-icon" title="Quelle: ${esc(hintSrc)}">📖</span> ` : ""}${esc(m.name)}</b> <span class="dim">${esc(e.name)}${chargeInfo}</span>
      <span class="dim small">${esc(m.desc)}</span>
    </label>`;
  }).join("");

  const pv = Engine.executionPreview(S);
  const chanceClass = pv.chance >= 0.7 ? "good" : pv.chance >= 0.45 ? "warn" : "bad";

  // Hinweis-Framework: Personal-Kompetenz, Bibliothek, Grimoire (bzw. Tutorial)
  const hintsHtml = hints.length ? `<div class="card preview know-hint">
    ${hints.map((h) => `<p class="small">${h.icon} <b title="Quelle: ${esc(h.source)}">${esc(h.source)}:</b> ${esc(h.text)}</p>`).join("")}
  </div>` : "";

  const quirkHtml = pv.quirkNotes.length
    ? `<p class="dim small">Eigenheiten: ${pv.quirkNotes.map((q) => `${esc(q.hunter)} (${esc(q.name)} ${q.delta > 0 ? "+" : ""}${Math.round(q.delta * 100)} %)`).join(", ")}</p>`
    : "";

  return `<div class="mission-body">
    <div class="mission-cols">
      <div>
        <h3>Maßnahmen platzieren <span class="dim">(${M.placements.length}/${max})</span></h3>
        <p class="dim small">Nur Konter, die zum Geist passen, erzeugen eine echte Erfolgschance – falsche Maßnahmen sind verschwendet.</p>
        <div class="pick-list">${rows || '<p class="dim">Keine Konter-Ausrüstung im Inventar!</p>'}</div>
      </div>
      <div>
        <h3>Beobachtungen</h3>
        <div class="tells">${observedHtml(M)}</div>
        ${hintsHtml}
        <h3>Einsatz-Prognose</h3>
        <div class="card preview">
          <p>Erfolgschance: <b class="${chanceClass}">${pct(pv.chance)}</b></p>
          <p>Kollateralrisiko: <b>${pct(pv.collateral)}</b></p>
          ${pv.lockedVariant ? `<p class="bad">🌫 Verschleierte Spuren deuten auf eine Variante jenseits eures Wissens – Chance gedeckelt. Rückzug erwägen, Grimoire füttern!</p>` : ""}
          <p class="dim small">${pv.matched.length} Konter greifen${pv.envBonus > 0 ? " · Umgebungsbonus aktiv" : ""}${pv.knowBonus > 0 ? " · Grimoire-Bonus aktiv" : ""}.
          Welche Konter fehlen, verrät nur die Diagnose.</p>
          ${quirkHtml}
        </div>
      </div>
    </div>
    <div class="btn-row">
      <button class="primary" onclick="UI.execute()">⚡ Bannung ausführen</button>
      <button class="danger" onclick="UI.abortMission()">Rückzug (Auftrag bleibt offen)</button>
    </div>
  </div>`;
}

function renderNachwirkung(M, c, loc) {
  const R = M.result;
  const d = Engine.district(S, c.districtId);
  const ghostsHtml = c.ghosts.map((e) => sprImg(e.id, e.tier, 5)).join(" ");
  const lines = [];
  if (R.success) {
    lines.push(`<p class="big good">${ghostsHtml} ✅ ${esc(R.ghostNames.join(" & "))} gebannt! (Chance: ${pct(R.chance)})</p>`);
    lines.push(`<p>Prämie: <b>+${fmt(R.pay)} ÄK</b>${R.cleanBonus ? ` · Bonus für saubere Bannung: <b>+${fmt(R.cleanBonus)} ÄK</b>` : ""}</p>`);
    if (R.collateral) lines.push(`<p class="warn">Kollateralschaden (${R.collateralUnits} Einheit(en)): −${fmt(R.penalty)} ÄK</p>`);
    if (R.specimens.length) lines.push(`<p>🧪 Essenzproben fürs Grimoire: ${R.specimens.map((s) => `${esc(s.name)} ×${s.n}`).join(", ")}</p>`);
  } else {
    lines.push(`<p class="big bad">${ghostsHtml} ❌ Die Entität entkam. (Chance: ${pct(R.chance)})</p>`);
    lines.push(`<p class="bad">Vertragsstrafe: −${fmt(R.penalty)} ÄK</p>`);
    lines.push(`<p class="dim">Identifiziert wurde: <b>${esc(R.ghostNames.join(" & "))}</b> – der Kodex wurde aktualisiert.</p>`);
    if (R.retry) lines.push(`<p class="warn">📖 Verhaltensmuster bekannt: Der Auftrag bleibt bestehen – ihr könnt es erneut versuchen.</p>`);
  }
  if (R.maintenance) lines.push(`<p>Wartung der Ausrüstung: −${fmt(R.maintenance)} ÄK</p>`);
  if (R.loot.length) lines.push(`<p>Beute: ${R.loot.map((l) => `<span class="rarity ${l.rarity}">${esc(l.name)}</span>`).join(", ")}</p>`);
  if (R.injuries.length) lines.push(`<p class="warn">Verletzungen: ${R.injuries.map((i) => `${esc(i.name)} (${i.kind === "serious" ? "schwer" : "leicht"})`).join(", ")}</p>`);
  lines.push(`<p class="dim">Reputation ${R.repDelta >= 0 ? "+" : ""}${R.repDelta} · Schleierdruck ${R.schleierDelta >= 0 ? "+" : ""}${R.schleierDelta}
    · Bezirk ${esc(d ? d.name : "?")} ${R.districtDelta >= 0 ? "+" : ""}${R.districtDelta} · Team-XP +${R.xp}</p>`);

  return `<div class="mission-body">
    <div class="aftermath">${lines.join("")}</div>
    <div class="btn-row"><button class="primary" onclick="UI.finishMission()">Zurück zur Zentrale</button></div>
  </div>`;
}

// ----------------------------------------------------------- Neues Spiel
function renderNewGameDialog() {
  return `<div class="mission-overlay"><div class="mission small-dialog">
    <h2>Neues Spiel</h2>
    <p class="dim">Gleicher Seed = exakt gleiche Stadt und gleicher Spielverlauf (deterministisch). Leer lassen für Zufall.</p>
    <input id="seed-input" type="text" placeholder="Seed (optional)" value="">
    <label class="check-row"><input id="tutorial-input" type="checkbox" checked>
      Tutorial-Phase (Tage 1–5: einfache Aufträge, Konter werden verraten)</label>
    <div class="btn-row">
      <button class="primary" onclick="UI.startNewGame()">Starten</button>
      <button onclick="UI.cancelNewGame()">Abbrechen</button>
    </div>
  </div></div>`;
}

// --------------------------------------------------------- Tagesereignis
function renderEventDialog() {
  const ev = DATA.EVENTS.find((e) => e.id === S.pendingEvent.id);
  return `<div class="mission-overlay"><div class="mission small-dialog event-dialog">
    <h2>📻 Zwischenfall</h2>
    <p>${esc(ev.text)}</p>
    <div class="btn-col">
      <button class="primary" onclick="UI.resolveEvent('a')">${esc(ev.a.label)}</button>
      <button onclick="UI.resolveEvent('b')">${esc(ev.b.label)}</button>
    </div>
  </div></div>`;
}

// ------------------------------------------------------------------- Render
function render() {
  const app = document.getElementById("app");
  let main = "";
  if (UI.tab === "karte") main = renderKarte();
  else if (UI.tab === "zentrale") main = renderZentrale();
  else if (UI.tab === "team") main = renderTeam();
  else if (UI.tab === "ausruestung") main = renderAusruestung();
  else if (UI.tab === "grimoire") main = renderGrimoire();

  app.innerHTML = renderHeader() + `<main>${main}</main>` +
    (S.mission ? renderMission() : "") +
    (!S.mission && S.pendingEvent ? renderEventDialog() : "") +
    (UI.showNewGame ? renderNewGameDialog() : "");

  afterRender();
}

// Canvas-Inhalte nach dem DOM-Aufbau zeichnen und Interaktion verdrahten
function afterRender() {
  if (typeof Gfx === "undefined" || typeof document.querySelector !== "function") return;
  const mapC = document.querySelector("#map-canvas");
  if (mapC) {
    Gfx.drawMap(mapC, S, UI.mapSel);
    mapC.onclick = (ev) => {
      const rect = mapC.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * (mapC.width / rect.width);
      const y = (ev.clientY - rect.top) * (mapC.height / rect.height);
      let best = null, bestDist = Infinity;
      for (const h of (mapC._hits || [])) {
        const dd = Math.hypot(h.x - x, h.y - y);
        if (dd < h.r && dd < bestDist) { best = h; bestDist = dd; }
      }
      UI.selectLoc(best ? best.locId : UI.mapSel);
    };
  }
  const hqC = document.querySelector("#hq-canvas");
  if (hqC) Gfx.drawHQ(hqC, S);
  const scC = document.querySelector("#scene-canvas");
  if (scC) Gfx.drawScene(scC, S);
}

// -------------------------------------------------------------------- Start
window.addEventListener("DOMContentLoaded", () => {
  S = Engine.load() || Engine.newGame("");
  Engine.save(S);
  render();
});

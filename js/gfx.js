// GhostHQ Grafik – rein prozedurale Canvas-Renderer (keine Bild-Assets).
// Alle Visuals werden deterministisch aus Seeds/IDs abgeleitet und nutzen einen
// EIGENEN Zufallsstrom – der Spiel-RNG (rng.js) bleibt davon unberührt.
"use strict";

const Gfx = {};

// Eigener, vom Spielzustand unabhängiger PRNG für Visuals
Gfx.rng = function (seedStr) {
  let t = RNG.seedFrom("gfx:" + seedStr);
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

Gfx._cache = new Map();

function shade(hex, f) { // f: -1 dunkler … +1 heller
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + (f > 0 ? (255 - v) * f : v * f))));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

// ------------------------------------------------------------ Geist-Sprite --
// Klassische Spiegel-Technik: halbes Bitmuster würfeln, spiegeln, einfärben.
// Ergibt pro Geist-ID ein wiedererkennbares, einzigartiges Pixelwesen.
Gfx.ghostSprite = function (ghostId, tier = 0, px = 6) {
  const key = `ghost:${ghostId}:${tier}:${px}`;
  if (Gfx._cache.has(key)) return Gfx._cache.get(key);
  const g = DATA.GHOSTS.find((x) => x.id === ghostId);
  const color = g ? DATA.FACTIONS[g.factionId].color : "#b48eff";
  const rnd = Gfx.rng(ghostId);
  const W = 12, H = 14, half = W / 2;
  const grid = [];
  for (let y = 0; y < H; y++) {
    grid[y] = [];
    for (let x = 0; x < half; x++) {
      // Geistform: dichter in der Mitte, ausgefranster Saum unten
      const cy = y / H, cx = x / half;
      let p = 0.75 - 0.5 * Math.abs(cy - 0.45) - 0.35 * (1 - cx);
      if (y >= H - 3) p = (x % 2 === y % 2) ? 0.65 : 0.15; // Fransen
      grid[y][x] = rnd() < p ? 1 : 0;
    }
  }
  const auraColors = { 1: "#e0a050", 2: "#ef6a6a", 3: "#b48eff" };
  const pad = tier > 0 ? 2 : 0;
  const cv = document.createElement("canvas");
  cv.width = (W + pad * 2) * px; cv.height = (H + pad * 2) * px;
  const ctx = cv.getContext("2d");
  if (tier > 0) { // Varianten-Aura
    ctx.fillStyle = auraColors[Math.min(3, tier)];
    ctx.globalAlpha = 0.25 + 0.1 * tier;
    ctx.beginPath();
    ctx.ellipse(cv.width / 2, cv.height / 2, cv.width / 2, cv.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const bit = grid[y][x < half ? x : W - 1 - x];
      if (!bit) continue;
      const f = (y < 3 ? 0.25 : y > H - 4 ? -0.25 : 0) + (rnd() < 0.15 ? 0.15 : 0);
      ctx.fillStyle = shade(color, f);
      ctx.fillRect((x + pad) * px, (y + pad) * px, px, px);
    }
  }
  // Augen (dunkel, symmetrisch)
  const ey = 3 + Math.floor(rnd() * 3);
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect((3 + pad) * px, (ey + pad) * px, px, px * 2);
  ctx.fillRect((W - 4 + pad) * px, (ey + pad) * px, px, px * 2);
  Gfx._cache.set(key, cv);
  return cv;
};

// ------------------------------------------------------------ Jäger-Sprite --
Gfx.CLASS_COLORS = { techniker: "#e0a050", okkultist: "#b48eff", spaeher: "#7ec98a", anker: "#8fa8c8", sanitaeter: "#ef8a8a" };
Gfx.hunterSprite = function (classId, nameSeed, px = 5) {
  const key = `hunter:${classId}:${nameSeed}:${px}`;
  if (Gfx._cache.has(key)) return Gfx._cache.get(key);
  const rnd = Gfx.rng(classId + nameSeed);
  const coat = Gfx.CLASS_COLORS[classId] || "#8fa8c8";
  const skinTones = ["#e8c39e", "#c68e5c", "#9c6b43", "#f0d5b8"];
  const skin = skinTones[Math.floor(rnd() * skinTones.length)];
  const hair = ["#2c2c34", "#5c4630", "#8a8a96", "#7a3020"][Math.floor(rnd() * 4)];
  const cv = document.createElement("canvas");
  const W = 8, H = 12;
  cv.width = W * px; cv.height = H * px;
  const ctx = cv.getContext("2d");
  const put = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x * px, y * px, px, px); };
  for (let x = 2; x <= 5; x++) put(x, 0, hair);                 // Haar
  for (let x = 2; x <= 5; x++) put(x, 1, x === 3 || x === 4 ? skin : hair);
  for (let x = 2; x <= 5; x++) put(x, 2, skin);                 // Gesicht
  put(3, 2, "#1a1a22"); put(4, 2, "#1a1a22");                   // Augen? nein: Brille/Blick
  for (let y = 3; y <= 8; y++) for (let x = 1; x <= 6; x++) {
    if (y === 3 && (x < 2 || x > 5)) continue;
    put(x, y, shade(coat, y % 2 ? 0 : -0.15));                  // Mantel
  }
  put(1, 4, skin); put(6, 4, skin);                              // Hände angedeutet
  for (let y = 9; y <= 11; y++) { put(2, y, "#23262f"); put(3, y, "#23262f"); put(4, y, "#23262f"); put(5, y, "#23262f"); } // Beine
  Gfx._cache.set(key, cv);
  return cv;
};

// ------------------------------------------------------------- Gebäude-Icon --
Gfx.buildingSprite = function (locId, biome, px = 3) {
  const key = `bld:${locId}:${px}`;
  if (Gfx._cache.has(key)) return Gfx._cache.get(key);
  const rnd = Gfx.rng(locId);
  const roofColors = { urban: "#7a5a48", sacred: "#c8b070", wilderness: "#3e6e4a", coastal: "#5a8aa8", industrial: "#8a6a52", underground: "#666a78" };
  const roof = roofColors[biome] || "#7a5a48";
  const wall = "#3a3f52";
  const W = 14, H = 12;
  const cv = document.createElement("canvas");
  cv.width = W * px; cv.height = H * px;
  const ctx = cv.getContext("2d");
  const put = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x * px, y * px, px, px); };
  if (biome === "wilderness") {           // Baumgruppe
    for (let i = 0; i < 3; i++) {
      const bx = 2 + i * 4, bh = 5 + Math.floor(rnd() * 3);
      for (let y = 0; y < bh; y++) for (let x = -1 - Math.floor(y / 2); x <= 1 + Math.floor(y / 2); x++) {
        if (bx + x >= 0 && bx + x < W) put(bx + x, H - 3 - bh + y, shade(roof, rnd() < 0.2 ? 0.15 : 0));
      }
      put(bx, H - 2, "#5a4630"); put(bx, H - 1, "#5a4630");
    }
  } else if (biome === "underground") {    // Schachtdeckel + Treppe
    for (let x = 2; x < 12; x++) put(x, H - 2, "#4a4f62");
    for (let y = 4; y < H - 2; y++) { put(4, y, wall); put(9, y, wall); }
    for (let x = 4; x <= 9; x++) put(x, 4, roof);
    put(6, 7, "#0b0d12"); put(7, 7, "#0b0d12"); put(6, 8, "#0b0d12"); put(7, 8, "#0b0d12");
  } else {                                 // Haus/Turm
    const towers = biome === "sacred" || rnd() < 0.3;
    const h = 5 + Math.floor(rnd() * 3);
    for (let y = H - h; y < H; y++) for (let x = 2; x < 12; x++) put(x, y, shade(wall, y % 3 ? 0 : -0.1));
    for (let x = 1; x < 13; x++) put(x, H - h - 1, roof);
    for (let x = 3; x < 11; x++) put(x, H - h - 2, roof);
    if (towers) { for (let y = 2; y < H - h; y++) put(6, y, wall), put(7, y, wall); put(6, 1, roof); put(7, 1, roof); }
    // Fenster
    for (let i = 0; i < 4; i++) {
      const wx = 3 + Math.floor(rnd() * 8), wy = H - h + 1 + Math.floor(rnd() * (h - 2));
      put(wx, wy, rnd() < 0.5 ? "#e5c07b" : "#1c2030");
    }
  }
  Gfx._cache.set(key, cv);
  return cv;
};

// --------------------------------------------------------------- Stadtkarte --
Gfx.MAP_W = 960; Gfx.MAP_H = 600;

Gfx.drawMap = function (canvas, S, selectedLocId) {
  const ctx = canvas.getContext("2d");
  canvas.width = Gfx.MAP_W; canvas.height = Gfx.MAP_H;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#0a0c11";
  ctx.fillRect(0, 0, Gfx.MAP_W, Gfx.MAP_H);

  // Bezirke: Grundton + prozedurale Häuserblocks
  for (const d of S.city.districts) {
    const rnd = Gfx.rng(S.seed + ":" + d.id);
    ctx.fillStyle = shade("#131722", (rnd() - 0.5) * 0.15);
    ctx.fillRect(d.x, d.y, d.w, d.h);
    const blocks = 26;
    for (let i = 0; i < blocks; i++) {
      const bw = 14 + rnd() * 26, bh = 10 + rnd() * 20;
      const bx = d.x + 12 + rnd() * (d.w - bw - 24);
      const by = d.y + 16 + rnd() * (d.h - bh - 30);
      ctx.fillStyle = shade("#1d2230", (rnd() - 0.5) * 0.3);
      ctx.fillRect(bx, by, bw, bh);
      if (rnd() < 0.5) { // erleuchtete Fenster
        ctx.fillStyle = "rgba(229,192,123,0.5)";
        ctx.fillRect(bx + 2 + rnd() * (bw - 4), by + 2 + rnd() * (bh - 4), 2, 2);
      }
    }
  }

  // Fluss
  ctx.strokeStyle = "#1e3a52";
  ctx.lineWidth = 20;
  ctx.lineJoin = "round";
  ctx.beginPath();
  S.city.river.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = "#2a4e6e";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Straßen an Bezirksgrenzen
  ctx.strokeStyle = "#232838";
  ctx.lineWidth = 5;
  for (const d of S.city.districts) ctx.strokeRect(d.x, d.y, d.w, d.h);

  // Schleier-Dunst pro Bezirk (lokale Gefahr)
  for (const d of S.city.districts) {
    if (d.veil <= 5) continue;
    const grad = ctx.createRadialGradient(d.x + d.w / 2, d.y + d.h / 2, 10, d.x + d.w / 2, d.y + d.h / 2, Math.max(d.w, d.h) / 1.4);
    grad.addColorStop(0, `rgba(140,90,220,${Math.min(0.45, d.veil / 180)})`);
    grad.addColorStop(1, "rgba(140,90,220,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }

  // Bezirksnamen + lokaler Schleierwert
  ctx.textAlign = "left";
  for (const d of S.city.districts) {
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = d.veil >= 80 ? "#ef6a6a" : "#9aa3b5";
    ctx.fillText(d.name.toUpperCase(), d.x + 10, d.y + 20);
    ctx.font = "11px monospace";
    ctx.fillStyle = d.veil >= 80 ? "#ef6a6a" : d.veil >= 50 ? "#e5c07b" : "#5d6578";
    ctx.fillText(`Schleier ${Math.round(d.veil)}${d.veil >= 80 ? " ⚠" : ""}`, d.x + 10, d.y + 34);
  }

  const hits = [];

  // HQ
  {
    const { x, y } = S.city.hq;
    ctx.fillStyle = "#1d3524";
    ctx.fillRect(x - 14, y - 12, 28, 22);
    ctx.fillStyle = "#34734a";
    ctx.beginPath(); ctx.moveTo(x - 17, y - 12); ctx.lineTo(x, y - 24); ctx.lineTo(x + 17, y - 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7ee787";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HQ", x, y + 3);
    ctx.fillText("▼", x, y + 24);
    if (S.contracts.some((c) => c.invasion)) { // Invasion läuft!
      ctx.strokeStyle = "#ef6a6a";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y - 2, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#ef6a6a";
      ctx.font = "bold 14px monospace";
      ctx.fillText("⚠ INVASION", x, y - 36);
    }
  }

  // Sensornetze
  ctx.font = "10px monospace";
  for (const districtId of Object.keys(S.grids || {})) {
    const d = S.city.districts.find((x) => x.id === districtId);
    if (!d) continue;
    ctx.fillStyle = "#7ee787";
    ctx.textAlign = "left";
    ctx.fillText("📡 Sensornetz", d.x + 10, d.y + 48);
  }

  // Orte
  ctx.textAlign = "center";
  for (const place of S.city.places) {
    const loc = DATA.LOCATIONS.find((l) => l.id === place.locId);
    const spr = Gfx.buildingSprite(loc.id, loc.biome);
    const contracts = S.contracts.filter((c) => c.locationId === loc.id);
    const sel = selectedLocId === loc.id;
    if (sel) {
      ctx.strokeStyle = "#7ee787";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(place.x, place.y, 30, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.drawImage(spr, place.x - spr.width / 2, place.y - spr.height / 2);
    ctx.font = "10px monospace";
    ctx.fillStyle = sel ? "#d6dbe8" : "#8b93a7";
    ctx.fillText(loc.name.split(",")[0].split(" der ")[0].slice(0, 24), place.x, place.y + spr.height / 2 + 12);
    if (contracts.length) {
      const legend = contracts.some((c) => c.legend);
      ctx.fillStyle = legend ? "#b48eff" : "#e5c07b";
      ctx.beginPath(); ctx.arc(place.x + 16, place.y - 18, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0b0d12";
      ctx.font = "bold 11px monospace";
      ctx.fillText(legend ? "⚜" : String(contracts.length), place.x + 16, place.y - 14);
    }
    hits.push({ x: place.x, y: place.y, r: 32, locId: loc.id });
  }

  // Wetter-Overlay
  const wrnd = Gfx.rng(S.seed + ":w:" + S.day);
  if (S.weather === "regen" || S.weather === "sturm") {
    ctx.strokeStyle = S.weather === "sturm" ? "rgba(160,180,220,0.35)" : "rgba(120,150,200,0.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 140; i++) {
      const x = wrnd() * Gfx.MAP_W, y = wrnd() * Gfx.MAP_H;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12); ctx.stroke();
    }
  } else if (S.weather === "nebel") {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = `rgba(180,190,210,${0.04 + wrnd() * 0.05})`;
      ctx.fillRect(0, wrnd() * Gfx.MAP_H, Gfx.MAP_W, 30 + wrnd() * 60);
    }
  }

  canvas._hits = hits;
};

// ---------------------------------------------------------- HQ-Querschnitt --
Gfx.drawHQ = function (canvas, S) {
  const W = 860, H = 340;
  const ctx = canvas.getContext("2d");
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#0a0c11";
  ctx.fillRect(0, 0, W, H);
  // Nachthimmel + Mond
  const rnd = Gfx.rng(S.seed + ":hq");
  ctx.fillStyle = "#d8d8e8";
  for (let i = 0; i < 40; i++) ctx.fillRect(rnd() * W, rnd() * 90, 1, 1);
  ctx.beginPath(); ctx.arc(W - 80, 50, 18, 0, Math.PI * 2); ctx.fillStyle = "#c8c8d8"; ctx.fill();
  // Boden
  ctx.fillStyle = "#151a24";
  ctx.fillRect(0, H - 30, W, 30);

  // Raum-Slots: 2 Etagen à 3 Räume über der Garage
  const roomIds = ["garage", "werkstatt", "archiv", "labor", "unterkunft", "kapelle"];
  const slots = {
    garage:     { x: 280, y: H - 130, w: 300, h: 100 },
    werkstatt:  { x: 130, y: H - 130, w: 140, h: 100 },
    labor:      { x: 590, y: H - 130, w: 140, h: 100 },
    archiv:     { x: 280, y: H - 220, w: 145, h: 80 },
    unterkunft: { x: 435, y: H - 220, w: 145, h: 80 },
    kapelle:    { x: 280, y: H - 288, w: 300, h: 58 },
  };
  const tints = { garage: "#2c3347", werkstatt: "#4a3a28", archiv: "#33405c", labor: "#2c4a3a", unterkunft: "#4a3040", kapelle: "#4a4430" };
  for (const id of roomIds) {
    const s = slots[id], lvl = S.hq[id];
    if (lvl > 0) {
      ctx.fillStyle = tints[id];
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = "#0a0c11"; ctx.lineWidth = 3;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      // prozedurales Inventar (Kisten, Regale, Kerzen …)
      const rr = Gfx.rng(S.seed + ":room:" + id + ":" + lvl);
      for (let i = 0; i < 3 + lvl * 2; i++) {
        const px = s.x + 8 + rr() * (s.w - 24), py = s.y + s.h - 10 - rr() * 18;
        ctx.fillStyle = shade(tints[id], 0.3);
        ctx.fillRect(px, py, 6 + rr() * 8, 6 + rr() * 10);
      }
      ctx.fillStyle = "#d6dbe8";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(DATA.ROOMS[id].name.split(" / ")[0], s.x + 8, s.y + 16);
      ctx.fillStyle = "#7ee787";
      ctx.fillText("◆".repeat(lvl), s.x + 8, s.y + 30);
    } else {
      ctx.strokeStyle = "#2c3347";
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      ctx.setLineDash([]);
      ctx.fillStyle = "#5d6578";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Bauplatz: " + DATA.ROOMS[id].name.split(" / ")[0], s.x + s.w / 2, s.y + s.h / 2);
    }
  }
  // Risse im Mauerwerk bei hohem Schleierdruck (sichtbare Vermittlung)
  if (S.schleier >= 50) {
    ctx.strokeStyle = "rgba(180,142,255,0.5)";
    ctx.lineWidth = 1.5;
    const cr = Gfx.rng(S.seed + ":cracks");
    const n = Math.floor((S.schleier - 40) / 12);
    for (let i = 0; i < n; i++) {
      let x = 140 + cr() * 580, y = H - 130 + cr() * 60;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let s2 = 0; s2 < 4; s2++) { x += (cr() - 0.5) * 22; y += cr() * 14; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  // Jäger:innen in der Garage
  const g = slots.garage;
  S.hunters.slice(0, 6).forEach((h, i) => {
    const spr = Gfx.hunterSprite(h.class, h.name, 4);
    ctx.drawImage(spr, g.x + 16 + i * 46, g.y + g.h - spr.height - 4);
    if (h.injury !== "none") {
      ctx.fillStyle = "#ef6a6a"; ctx.font = "10px monospace"; ctx.textAlign = "center";
      ctx.fillText("✚", g.x + 16 + i * 46 + spr.width / 2, g.y + g.h - spr.height - 8);
    }
  });
  // Einsatzwagen
  ctx.fillStyle = "#23262f";
  ctx.fillRect(g.x + g.w - 90, g.y + g.h - 34, 74, 24);
  ctx.fillStyle = "#8b93a7";
  ctx.fillRect(g.x + g.w - 84, g.y + g.h - 46, 46, 14);
  ctx.fillStyle = "#0a0c11";
  ctx.beginPath(); ctx.arc(g.x + g.w - 74, g.y + g.h - 8, 7, 0, Math.PI * 2); ctx.arc(g.x + g.w - 34, g.y + g.h - 8, 7, 0, Math.PI * 2); ctx.fill();
};

// -------------------------------------------------------------- Einsatzszene --
Gfx.drawScene = function (canvas, S) {
  const M = S.mission;
  const c = Engine.missionContract(S);
  const loc = Engine.loc(c.locationId);
  const W = 900, H = 210;
  const ctx = canvas.getContext("2d");
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = false;
  const rnd = Gfx.rng(S.seed + ":scene:" + c.id);

  // Hintergrund nach Biom
  const bgTints = { urban: "#141824", sacred: "#1a1826", wilderness: "#101a14", coastal: "#101a22", industrial: "#1a1612", underground: "#12121a" };
  const bg = bgTints[loc.biome] || "#141824";
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, shade(bg, 0.1));
  grad.addColorStop(1, shade(bg, -0.4));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Boden
  ctx.fillStyle = shade(bg, -0.5);
  ctx.fillRect(0, H - 26, W, 26);

  // Requisiten aus Umwelt-Tags (prozedural)
  const tags = M.envTags;
  const prop = (fn, n) => { for (let i = 0; i < n; i++) fn(60 + rnd() * (W - 320), rnd()); };
  if (tags.includes("cluttered")) prop((x, r) => { // Kisten
    ctx.fillStyle = "#3a3226"; const s2 = 14 + r * 16; ctx.fillRect(x, H - 26 - s2, s2, s2);
    ctx.strokeStyle = "#241f16"; ctx.strokeRect(x, H - 26 - s2, s2, s2);
  }, 5);
  if (tags.includes("eisen")) prop((x) => { // Eisenträger
    ctx.fillStyle = "#3d434f"; ctx.fillRect(x, 20, 10, H - 46);
    ctx.fillStyle = "#2b303a"; for (let y = 30; y < H - 40; y += 18) ctx.fillRect(x + 2, y, 6, 4);
  }, 3);
  if (tags.includes("sanctified")) prop((x) => { // Bogenfenster
    ctx.fillStyle = "#2a2438"; ctx.fillRect(x, 30, 26, 70);
    ctx.beginPath(); ctx.arc(x + 13, 30, 13, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "rgba(224,192,112,0.25)"; ctx.fillRect(x + 4, 40, 18, 55);
  }, 3);
  if (tags.includes("flammable") ) prop((x) => { // Kerzen
    ctx.fillStyle = "#d8d0c0"; ctx.fillRect(x, H - 40, 4, 14);
    ctx.fillStyle = "#e5a03b"; ctx.fillRect(x + 1, H - 46, 2, 5);
  }, 6);
  if (tags.includes("damp") || tags.includes("laufwasser")) { // Pfützen
    ctx.fillStyle = "rgba(60,120,180,0.3)";
    for (let i = 0; i < 6; i++) { const x = rnd() * W, w2 = 30 + rnd() * 60; ctx.fillRect(x, H - 24, w2, 4); }
  }
  if (tags.includes("elektrifiziert")) prop((x) => { // flackernde Lampe
    ctx.strokeStyle = "#4a4f5e"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 26); ctx.stroke();
    ctx.fillStyle = rnd() < 0.6 ? "#e5c07b" : "#4a4f5e";
    ctx.beginPath(); ctx.arc(x, 32, 6, 0, Math.PI * 2); ctx.fill();
  }, 3);
  if (tags.includes("dunkel")) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, 0, W, H); }

  // Schleier-Verfall: In Hochschleier-Bezirken zersetzt sich die Szene sichtbar.
  // Wichtig: Der Verfall gehört zum Hintergrund-Pass – Team- und Geist-Sprites
  // werden erst DANACH gezeichnet und bleiben dadurch sauber freigestellt.
  const sceneDistrict = Engine.districtOfLoc(S, loc.id);
  if (sceneDistrict && sceneDistrict.veil >= 70) {
    const decay = (sceneDistrict.veil - 60) / 40; // 0.25 … 1.0
    ctx.fillStyle = `rgba(120,70,200,${0.10 * decay})`;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40 * decay; i++) { // treibende Schleier-Partikel
      ctx.fillStyle = `rgba(180,142,255,${0.15 + rnd() * 0.3})`;
      ctx.fillRect(rnd() * W, rnd() * (H - 30), 2, 2);
    }
    ctx.strokeStyle = `rgba(180,142,255,${0.3 * decay})`; // Risse im Raum selbst
    ctx.lineWidth = 1;
    for (let i = 0; i < 4 * decay; i++) {
      let x = rnd() * W, y = rnd() * (H - 60);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let s2 = 0; s2 < 4; s2++) { x += (rnd() - 0.5) * 30; y += rnd() * 16; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }

  // Team links
  M.teamIds.forEach((hid, i) => {
    const h = Engine.hunter(S, hid);
    const spr = Gfx.hunterSprite(h.class, h.name, 5);
    ctx.drawImage(spr, 30 + i * 56, H - 26 - spr.height);
    // Taschenlampen-Kegel
    ctx.fillStyle = "rgba(229,192,123,0.07)";
    ctx.beginPath();
    ctx.moveTo(30 + i * 56 + spr.width, H - 26 - spr.height + 20);
    ctx.lineTo(30 + i * 56 + spr.width + 160, H - 26 - spr.height - 10);
    ctx.lineTo(30 + i * 56 + spr.width + 160, H - 26 + 6);
    ctx.closePath(); ctx.fill();
  });

  // Platzierte Maßnahmen (Mitte)
  const glyphs = { salz: "⋯", erdung: "‡", schutz: "◈", stille: "◎", bann: "✠", laterne: "⌂", verhuellen: "▒", zeitanker: "⧗" };
  ctx.font = "16px monospace";
  ctx.textAlign = "center";
  M.placements.forEach((p, i) => {
    const px2 = W / 2 - 110 + i * 74;
    ctx.fillStyle = "#7ee787";
    ctx.fillText(glyphs[p.method] || "▪", px2, H - 34);
    ctx.fillStyle = "#5d6578";
    ctx.font = "9px monospace";
    ctx.fillText(DATA.METHODS[p.method].name.replace(/Sigill „(.+)“/, "$1").slice(0, 9), px2, H - 20);
    ctx.font = "16px monospace";
  });

  // Entität rechts: unbekannt = dunkle Silhouette, nach Auswertung sichtbar
  const revealed = M.phase === "nachwirkung";
  c.ghosts.forEach((entry, i) => {
    const spr = Gfx.ghostSprite(entry.id, entry.tier, 7);
    const gx = W - 150 - i * 110, gy = 40 + (i % 2) * 14;
    if (revealed) {
      if (M.result && M.result.success) {
        ctx.globalAlpha = 0.55;
        ctx.drawImage(spr, gx, gy);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#7ee787"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(gx + spr.width / 2, gy + spr.height / 2, spr.width / 2 + 8, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(spr, gx, gy);
        ctx.globalAlpha = 1;
      }
    } else {
      // Silhouette + Fragezeichen
      ctx.save();
      ctx.filter = "brightness(0.25) blur(1px)";
      ctx.drawImage(spr, gx, gy);
      ctx.restore();
      ctx.fillStyle = "#b48eff";
      ctx.font = "bold 22px monospace";
      ctx.fillText("?", gx + spr.width / 2, gy - 6);
      ctx.font = "16px monospace";
    }
  });

  // Ortsname
  ctx.fillStyle = "#8b93a7";
  ctx.font = "11px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${loc.name} · ${DATA.WEATHER[S.weather].icon} ${DATA.WEATHER[S.weather].name}`, 10, 16);
};

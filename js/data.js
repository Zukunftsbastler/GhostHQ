// Kanonische Inhaltsdaten – datengetrieben gemäß SCHEMAS.md aus der README.
// Alle Systeme (Sim-Loop, Encounter-Loop, Grafik, UI) lesen ausschließlich aus DATA.
"use strict";

const DATA = {};

// ---------------------------------------------------------------- Traits ----
// Jede Eigenschaft hinterlässt eine Spur (Kanal + Text) und hat einen Konter.
//  subtlety:       wie schwer die Spur eindeutig zu lesen ist (1 leicht … 4 schwer)
//  senses:         mit bloßen Sinnen wahrnehmbar (hohe Aufklärung nötig);
//                  false = nur mit dem passenden Werkzeug erkennbar
//  confusableWith: Verwechslungsgefahr mit einer anderen Spur desselben Kanals
//  ambiguous:      Text, der bei unklarer Lesung angezeigt wird
DATA.TRAITS = {
  "elektrostatik": { name: "Elektrostatik", channel: "emf", counter: "erdung",
    tell: "EMF-Sägezahnmuster, gleichmäßiges Knistern", subtlety: 2, senses: false,
    confusableWith: "heilige-symbole", ambiguous: "EMF-Ausschläge – gleichmäßiges Knistern oder punktuelle Spitzen nahe bestimmter Objekte?" },
  "heilige-symbole": { name: "Symbol-Empfindlich", channel: "emf", counter: "bann",
    tell: "EMF-Spitzen nur nahe geweihter Objekte", subtlety: 4, senses: false,
    confusableWith: "elektrostatik", ambiguous: "EMF-Ausschläge – gleichmäßiges Knistern oder punktuelle Spitzen nahe bestimmter Objekte?" },
  "objektwurf": { name: "Objektwurf", channel: "audio", counter: "salz",
    tell: "metallisches Klicken, polternde Objekte", subtlety: 1, senses: true,
    confusableWith: null, ambiguous: null },
  "kaeltefeld": { name: "Kältefeld", channel: "thermo", counter: "schutz",
    tell: "flächiges Temperaturtal, Atem kondensiert", subtlety: 2, senses: true,
    confusableWith: "schattenform", ambiguous: "Kalte Zonen im Thermobild – ein flächiges Feld oder wandernde Silhouetten?" },
  "schattenform": { name: "Schattenform", channel: "thermo", counter: "laterne",
    tell: "wandernde kalte Silhouetten ohne Wärmequelle", subtlety: 4, senses: false,
    confusableWith: "kaeltefeld", ambiguous: "Kalte Zonen im Thermobild – ein flächiges Feld oder wandernde Silhouetten?" },
  "resonanzschrei": { name: "Resonanzschrei", channel: "audio", counter: "stille",
    tell: "verzerrte Audiospitzen, anschwellendes Sirren", subtlety: 3, senses: true,
    confusableWith: "klagelied", ambiguous: "Klagende Frequenzen – schwillt es zum Schrei an oder bleibt es ein Lied?" },
  "klagelied": { name: "Klagelied", channel: "audio", counter: "stille",
    tell: "leises Klagen, harmonische Lücken im Spektrogramm", subtlety: 2, senses: true,
    confusableWith: "resonanzschrei", ambiguous: "Klagende Frequenzen – schwillt es zum Schrei an oder bleibt es ein Lied?" },
  "lichtflackern": { name: "Lichtflackern", channel: "visuell", counter: "laterne",
    tell: "oszillierende Lichtpunkte, tanzende Reflexe", subtlety: 3, senses: true,
    confusableWith: "wasser-bindung", ambiguous: "Tanzende Lichter – eigenständige Irrlichter oder Reflexe über nassem Grund?" },
  "wasser-bindung": { name: "Wasser-Bindung", channel: "visuell", counter: "salz",
    tell: "Schlieren und Lichter, die nassem Boden folgen", subtlety: 3, senses: true,
    confusableWith: "lichtflackern", ambiguous: "Tanzende Lichter – eigenständige Irrlichter oder Reflexe über nassem Grund?" },
  "spiegel-uebergang": { name: "Spiegel-Übergang", channel: "visuell", counter: "verhuellen",
    tell: "Spiegel beschlagen von innen", subtlety: 3, senses: true,
    confusableWith: "zeitversatz", ambiguous: "Der Raum stimmt nicht – liegt es an den Spiegeln oder an der Zeit selbst?" },
  "zeitversatz": { name: "Zeitversatz", channel: "visuell", counter: "zeitanker",
    tell: "rückwärts laufende Fußspuren, stehengebliebene Uhren", subtlety: 4, senses: true,
    confusableWith: "spiegel-uebergang", ambiguous: "Der Raum stimmt nicht – liegt es an den Spiegeln oder an der Zeit selbst?" },
  // passiv – kein Konter nötig, aber Umgebung hilft:
  "eisen-schwaeche": { name: "Eisen-Schwäche", channel: null, counter: null,
    tell: null, subtlety: 0, senses: false, confusableWith: null, ambiguous: null, envBoost: "eisen" },
};

DATA.METHODS = {
  erdung:     { name: "Erdung",            desc: "Ladung ableiten, Bindekreis schließen" },
  salz:       { name: "Salzlinie",         desc: "Barriere legen, Bewegung verlangsamen" },
  schutz:     { name: "Sigill „Schutz“",   desc: "Team gegen Kältefelder abschirmen" },
  stille:     { name: "Sigill „Stille“",   desc: "Schreie und Klagen ersticken" },
  bann:       { name: "Sigill „Bann“",     desc: "Geweihte Bannformel projizieren" },
  laterne:    { name: "Lichtbindung",      desc: "Lichtaffine Formen in der Laterne fangen" },
  verhuellen: { name: "Verhüllen",         desc: "Spiegel und Reflexionen abdecken" },
  zeitanker:  { name: "Zeitanker",         desc: "Zeitversatz stabilisieren, Flucht verhindern" },
};

// ------------------------------------------------------------- Fraktionen ---
DATA.FACTIONS = {
  restlose:      { name: "Restlose",               theme: "Unruhige Tote",         lootBase: 30, color: "#8fa8c8" },
  naturgebunden: { name: "Naturgebundene",         theme: "Geister der Wildnis",   lootBase: 35, color: "#7ec98a" },
  anomalien:     { name: "Anomalien",              theme: "Risse in der Realität", lootBase: 50, color: "#b48eff" },
  geweihte:      { name: "Geweihte/Entweihte",     theme: "Sakrale Geister",       lootBase: 40, color: "#e0c070" },
  vergessene:    { name: "Vergessene Geschichten", theme: "Legenden und Sagen",    lootBase: 35, color: "#d8d8e8" },
};

// ---------------------------------------------------------------- Geister ---
DATA.GHOSTS = [
  { id: "poltergeist_werkbank", name: "Poltergeist der Werkbank", factionId: "restlose", rank: "minion",
    traits: ["elektrostatik", "objektwurf", "eisen-schwaeche"], dangerRating: 2,
    loot: [{ type: "artifact", name: "Schraubenschlüssel-Artefakt", rarity: "common" }, { type: "essence", name: "Restlose-Essenz", rarity: "common" }],
    notes: "Wirft Werkzeug, lädt Metall statisch auf. Erdung + Salz-Bindekreis bannen ihn zuverlässig." },
  { id: "klagegestalt", name: "Klagegestalt", factionId: "vergessene", rank: "minion",
    traits: ["klagelied"], dangerRating: 1,
    loot: [{ type: "essence", name: "Tränenessenz", rarity: "common" }],
    notes: "Harmlos, aber zermürbend. Ein Sigill der Stille genügt." },
  { id: "dryft", name: "Dryft (Nebelgeborene)", factionId: "naturgebunden", rank: "minion",
    traits: ["wasser-bindung", "kaeltefeld"], dangerRating: 3,
    loot: [{ type: "essence", name: "Nebelessenz", rarity: "common" }],
    notes: "Zieht mit dem Nebel. Salz über nassem Boden bricht die Bindung." },
  { id: "kirchhofwaechter", name: "Kirchhofwächter", factionId: "geweihte", rank: "minion",
    traits: ["kaeltefeld", "heilige-symbole"], dangerRating: 3,
    loot: [{ type: "essence", name: "Weihrauch-Essenz", rarity: "uncommon" }],
    notes: "Bewacht Gräber. Reagiert nur auf geweihte Bannformeln." },
  { id: "irrlichtfuehrer", name: "Irrlichtführer", factionId: "naturgebunden", rank: "elite",
    traits: ["lichtflackern", "wasser-bindung"], dangerRating: 4,
    loot: [{ type: "artifact", name: "Moorfunken", rarity: "uncommon" }, { type: "essence", name: "Irrlicht-Essenz", rarity: "uncommon" }],
    notes: "Lockt in die Tiefe. Laterne mit prismatischer Linse plus Salzsprühung." },
  { id: "weisse_frau", name: "Weiße Frau", factionId: "vergessene", rank: "elite",
    traits: ["kaeltefeld", "klagelied"], dangerRating: 4,
    loot: [{ type: "artifact", name: "Brautschleier-Fetzen", rarity: "uncommon" }],
    notes: "Wandelt auf alten Wegen. Stille und Schutz beenden ihre Klage." },
  { id: "revenant", name: "Revenant", factionId: "restlose", rank: "elite",
    traits: ["objektwurf", "kaeltefeld", "eisen-schwaeche"], dangerRating: 5,
    loot: [{ type: "essence", name: "Grabkälte-Essenz", rarity: "rare" }],
    notes: "Kehrt zurück, bis sein Groll gebrochen ist. Eisenreiche Orte schwächen ihn." },
  { id: "banshee_dunhall", name: "Banshee von Dunhall", factionId: "restlose", rank: "elite",
    traits: ["resonanzschrei", "kaeltefeld", "heilige-symbole"], dangerRating: 5,
    loot: [{ type: "artifact", name: "Klangsplitter", rarity: "rare" }],
    notes: "Tiefe Temperaturtäler kündigen den Schrei an. Sigill „Stille“ vor dem Schrei setzen!" },
  { id: "moorfrau", name: "Moorfrau", factionId: "naturgebunden", rank: "elite",
    traits: ["wasser-bindung", "klagelied"], dangerRating: 5,
    loot: [{ type: "essence", name: "Moorwasser-Essenz", rarity: "rare" }],
    notes: "Singt aus dem Schilf. Salzlinien am Ufer, Stille gegen den Gesang." },
  { id: "schwarzer_hund", name: "Schwarzer Hund", factionId: "vergessene", rank: "elite",
    traits: ["schattenform", "kaeltefeld"], dangerRating: 5,
    loot: [{ type: "artifact", name: "Obsidianzahn", rarity: "rare" }],
    notes: "Ein Omen auf vier Pfoten. Lichtbindung hält ihn, Schutz das Team." },
  { id: "schattenriss", name: "Schattenriss", factionId: "anomalien", rank: "elite",
    traits: ["schattenform", "elektrostatik"], dangerRating: 5,
    loot: [{ type: "essence", name: "Dunkelessenz", rarity: "rare" }],
    notes: "Ein Riss, der Licht frisst. Erden, dann in die Laterne zwingen." },
  { id: "profanierter_moench", name: "Profanierter Mönch", factionId: "geweihte", rank: "boss",
    traits: ["heilige-symbole", "resonanzschrei", "schattenform"], dangerRating: 6,
    loot: [{ type: "artifact", name: "Geschwärztes Brevier", rarity: "rare" }, { type: "essence", name: "Entweihte Essenz", rarity: "rare" }],
    notes: "Predigt rückwärts. Bann, Stille und Licht – in dieser Reihenfolge." },
  { id: "yurei", name: "Yūrei", factionId: "geweihte", rank: "boss",
    traits: ["kaeltefeld", "klagelied", "spiegel-uebergang"], dangerRating: 6,
    loot: [{ type: "artifact", name: "Kammspange", rarity: "rare" }],
    notes: "Erscheint in Spiegeln und Wasserflächen. Verhüllen unterbricht den Übergang." },
  { id: "spiegelkind", name: "Spiegelkind", factionId: "anomalien", rank: "boss",
    traits: ["spiegel-uebergang", "zeitversatz"], dangerRating: 7,
    loot: [{ type: "artifact", name: "Quecksilbersplitter", rarity: "epic" }],
    notes: "Spiegel beschlagen nach innen, Fußspuren laufen rückwärts. Verhüllen + Zeitanker." },
  { id: "zeitzehrer", name: "Zeitzehrer", factionId: "anomalien", rank: "boss",
    traits: ["zeitversatz", "elektrostatik", "schattenform"], dangerRating: 8,
    loot: [{ type: "artifact", name: "Stillstands-Uhrwerk", rarity: "epic" }],
    notes: "Frisst Minuten. Ohne Zeitanker entkommt er jedem Zugriff." },
  { id: "schleierfuerst", name: "Der Schleierfürst", factionId: "anomalien", rank: "legend",
    traits: ["zeitversatz", "spiegel-uebergang", "resonanzschrei", "schattenform"], dangerRating: 10,
    loot: [{ type: "artifact", name: "Schleierkrone", rarity: "epic" }, { type: "essence", name: "Schleieressenz", rarity: "epic" }],
    notes: "Dort, wo der Schleier am dünnsten ist. Wer ihn bannt, gibt der Stadt Jahre zurück." },
];

// ------------------------------------------------------- Varianten-Stufen ---
// Höhere Stufen entstehen in Bezirken mit hohem lokalem Schleier. Ab Stufe 2
// sind die Spuren ohne Grimoire-Wissen (Variantenkunde) unlesbar verschleiert.
DATA.VARIANT_TIERS = [
  { tier: 0, prefix: "",              dangerMod: 0, payMult: 1.0, extraTraits: 0, needsKnow: null },
  { tier: 1, prefix: "Zornige(r) ",   dangerMod: 1, payMult: 1.3, extraTraits: 0, needsKnow: null },
  { tier: 2, prefix: "Uralte(r) ",    dangerMod: 2, payMult: 1.7, extraTraits: 1, needsKnow: "varianten1" },
  { tier: 3, prefix: "Schleiernahe(r) ", dangerMod: 4, payMult: 2.2, extraTraits: 2, needsKnow: "varianten2" },
];

// ------------------------------------------------ Grimoire: Wissenskomponenten
// Sequentiell freischaltbar pro Geistertyp; Studium kostet Essenzproben.
// lore-Texte nutzen {name} als Platzhalter.
DATA.KNOWLEDGE = [
  { id: "habitat", name: "Habitat & Reviere", cost: 3,
    effect: "Aufträge, hinter denen dieser Geist steckt, werden auf der Karte als Vermutung markiert.",
    lore: "Die Feldnotizen ergeben ein Muster: {name} sucht Orte, die dem eigenen alten Leben gleichen – die Stadtkarte liest sich fortan wie ein Fährtenbuch." },
  { id: "wirken", name: "Wirken am Ort", cost: 4,
    effect: "Zu Einsatzbeginn wird eine Spur dieses Geists automatisch aufgedeckt.",
    lore: "Was {name} an einem Ort anrichtet, folgt einem Ritual aus Wiederholung. Wer das Ritual kennt, weiß, wonach er zuerst suchen muss." },
  { id: "gefahr", name: "Gefährdungsprofil", cost: 6,
    effect: "Exakte Bedrohung sichtbar; Verletzungsrisiko gegen diesen Geist halbiert.",
    lore: "Erst die Sektion der Essenzproben zeigt, wann {name} wirklich zuschlägt – und wann nur droht. Das Team weiß nun, wann es weichen muss." },
  { id: "spuren", name: "Spurenkunde", cost: 8,
    effect: "Spuren dieses Geists sind immer eindeutig – keine Verwechslungsgefahr mehr.",
    lore: "Zwischen hundert Fehldeutungen liegt die eine Signatur, die nur {name} hinterlässt. Eure Diagnostiker erkennen sie jetzt auf einen Blick." },
  { id: "schwachstellen", name: "Schwachstellenanalyse", cost: 10,
    effect: "Ist der Geist eindeutig identifiziert, zeigt die Vorbereitung die nötigen Konter an.",
    lore: "Jede Essenz hat Nähte. Das Labor hat die von {name} kartiert – ihr wisst nun, wo der Bann ansetzen muss." },
  { id: "bann", name: "Bannformel", cost: 13,
    effect: "+10 % Erfolgschance gegen diesen Geist.",
    lore: "Aus alten Protokollen und eigenen Proben destilliert: eine Bannformel, auf {name} zugeschnitten wie ein Schlüsselbart." },
  { id: "verhalten", name: "Verhaltensmuster", cost: 16,
    effect: "Entkommt der Geist, bleibt der Auftrag bestehen – ein zweiter Versuch ist möglich.",
    lore: "{name} flieht nicht ziellos, sondern kehrt an denselben Ort zurück. Wer das weiß, verliert eine Schlacht, aber nie die Spur." },
  { id: "zyklus", name: "Manifestationszyklus", cost: 19,
    effect: "+1 Scan bei Einsätzen gegen diesen Geist.",
    lore: "Die Manifestation von {name} ebbt und flutet in festen Zyklen. Eure Teams messen jetzt genau dann, wenn der Schleier am dünnsten ist." },
  { id: "essenz", name: "Essenzstruktur", cost: 22,
    effect: "Beute dieses Geists +50 % Wert; saubere Bannung liefert +1 Essenzprobe.",
    lore: "Die Essenz von {name} lässt sich verlustfrei destillieren, seit das Labor ihre Gitterstruktur versteht." },
  { id: "varianten1", name: "Variantenkunde I", cost: 26,
    effect: "Uralte Varianten (Stufe 2) werden diagnostizierbar und bannbar.",
    lore: "Je älter {name} wird, desto mehr Masken trägt die Essenz. Ihr habt gelernt, unter die erste Maske zu sehen." },
  { id: "varianten2", name: "Variantenkunde II", cost: 30,
    effect: "Schleiernahe Varianten (Stufe 3) werden diagnostizierbar; +5 % Erfolgschance.",
    lore: "Am Rand des Schleiers ist {name} kaum noch von der Dunkelheit dahinter zu unterscheiden. Kaum – aber eben doch." },
  { id: "meister", name: "Meisterschaft", cost: 35,
    effect: "+15 % Erfolgschance, Kollateralrisiko gegen diesen Geist halbiert.",
    lore: "Ihr kennt {name} inzwischen besser als er sich selbst. Was einst Jagd war, ist jetzt Handwerk." },
];

// ------------------------------------------------------------------ Orte ----
DATA.LOCATIONS = [
  { id: "dachboden", name: "Dachboden der Familie Brack", biome: "urban", outdoor: false,
    environmentTags: ["cluttered", "dunkel"], factionBias: [{ factionId: "restlose", weight: 3 }, { factionId: "vergessene", weight: 1 }],
    hazards: ["zerbrechlich"], publicPlace: false, maxRoomCount: 3 },
  { id: "friedhof", name: "Friedhof St. Alwin", biome: "sacred", outdoor: true,
    environmentTags: ["sanctified", "eisen", "dunkel"], factionBias: [{ factionId: "geweihte", weight: 3 }, { factionId: "restlose", weight: 2 }, { factionId: "vergessene", weight: 1 }],
    hazards: [], publicPlace: false, maxRoomCount: 5 },
  { id: "wald", name: "Nadelwald am Kesselgrund", biome: "wilderness", outdoor: true,
    environmentTags: ["damp", "dunkel", "echoey", "laufwasser"], factionBias: [{ factionId: "naturgebunden", weight: 3 }, { factionId: "vergessene", weight: 1 }],
    hazards: [], publicPlace: false, maxRoomCount: 6 },
  { id: "kirche", name: "Kapelle zur Ewigen Wacht", biome: "sacred", outdoor: false,
    environmentTags: ["sanctified", "echoey"], factionBias: [{ factionId: "geweihte", weight: 3 }, { factionId: "restlose", weight: 1 }],
    hazards: ["kerzen"], publicPlace: false, maxRoomCount: 4 },
  { id: "alte_villa", name: "Villa Morgenroth", biome: "urban", outdoor: false,
    environmentTags: ["cluttered", "flammable", "dunkel"], factionBias: [{ factionId: "anomalien", weight: 2 }, { factionId: "restlose", weight: 1 }, { factionId: "vergessene", weight: 1 }],
    hazards: ["antiquitaeten", "kerzen"], publicPlace: false, maxRoomCount: 8 },
  { id: "krankenhaus", name: "Altes Klinikum Ost", biome: "urban", outdoor: false,
    environmentTags: ["elektrifiziert", "echoey"], factionBias: [{ factionId: "restlose", weight: 2 }, { factionId: "vergessene", weight: 2 }],
    hazards: [], publicPlace: false, maxRoomCount: 10 },
  { id: "leuchtturm", name: "Leuchtturm Graufels", biome: "coastal", outdoor: true,
    environmentTags: ["laufwasser", "eisen", "damp"], factionBias: [{ factionId: "naturgebunden", weight: 2 }, { factionId: "vergessene", weight: 2 }],
    hazards: [], publicPlace: false, maxRoomCount: 4 },
  { id: "industrieanlage", name: "Stillgelegtes Walzwerk", biome: "industrial", outdoor: false,
    environmentTags: ["eisen", "elektrifiziert", "flammable"], factionBias: [{ factionId: "restlose", weight: 2 }, { factionId: "anomalien", weight: 2 }],
    hazards: [], publicPlace: false, maxRoomCount: 9 },
  { id: "kanalisation", name: "Kanalisation, Abschnitt 7", biome: "underground", outdoor: false,
    environmentTags: ["damp", "laufwasser", "dunkel"], factionBias: [{ factionId: "naturgebunden", weight: 3 }, { factionId: "anomalien", weight: 1 }],
    hazards: [], publicPlace: false, maxRoomCount: 7 },
  { id: "bunker", name: "Tiefbunker Linie IV", biome: "underground", outdoor: false,
    environmentTags: ["eisen", "dunkel", "echoey"], factionBias: [{ factionId: "restlose", weight: 2 }, { factionId: "anomalien", weight: 2 }],
    hazards: [], publicPlace: false, maxRoomCount: 6 },
  { id: "museum", name: "Stadtmuseum am Ring", biome: "urban", outdoor: false,
    environmentTags: ["cluttered", "elektrifiziert"], factionBias: [{ factionId: "anomalien", weight: 2 }, { factionId: "vergessene", weight: 2 }],
    hazards: ["antiquitaeten"], publicPlace: true, maxRoomCount: 8 },
  { id: "theater", name: "Theater Odeum", biome: "urban", outdoor: false,
    environmentTags: ["echoey", "cluttered", "flammable"], factionBias: [{ factionId: "vergessene", weight: 2 }, { factionId: "restlose", weight: 2 }],
    hazards: ["kerzen"], publicPlace: true, maxRoomCount: 6 },
  // Spezialort: taucht nie im normalen Auftragspool oder auf der Karte auf –
  // nur für HQ-Invasionen, wenn der Heimatbezirk zu kippen droht.
  { id: "hq_verteidigung", name: "GhostHQ – Garage (Verteidigung!)", biome: "urban", outdoor: false,
    environmentTags: ["eisen", "cluttered"], factionBias: [
      { factionId: "restlose", weight: 1 }, { factionId: "anomalien", weight: 1 },
      { factionId: "vergessene", weight: 1 }, { factionId: "geweihte", weight: 1 }, { factionId: "naturgebunden", weight: 1 }],
    hazards: [], publicPlace: false, maxRoomCount: 3, special: "hq" },
];

DATA.ENV_TAG_INFO = {
  damp:          { name: "Feucht",         hint: "Salz-Konter wirken stärker." },
  laufwasser:    { name: "Fließwasser",    hint: "Salz-Konter wirken stärker, Naturgebundene fühlen sich wohl." },
  eisen:         { name: "Eisenlastig",    hint: "Schwächt Geister mit Eisen-Schwäche, verstärkt Erdung." },
  sanctified:    { name: "Geweiht",        hint: "Bann- und Stille-Sigillen wirken stärker." },
  dunkel:        { name: "Dunkel",         hint: "Erschwert die Diagnose (−1 Scan)." },
  echoey:        { name: "Halligkeit",     hint: "Audio-Scans kosten keinen Scan-Punkt." },
  elektrifiziert:{ name: "Elektrifiziert", hint: "EMF-Messungen unbrauchbar ohne Spektralanalyse (T2)." },
  flammable:     { name: "Entflammbar",    hint: "Höheres Kollateralrisiko." },
  cluttered:     { name: "Vollgestellt",   hint: "Höheres Kollateralrisiko." },
};

DATA.HAZARD_INFO = {
  zerbrechlich:  { name: "Zerbrechliches Inventar", collateral: 0.10 },
  kerzen:        { name: "Offene Kerzen",           collateral: 0.10 },
  antiquitaeten: { name: "Wertvolle Antiquitäten",  collateral: 0.10 },
};

// ------------------------------------------------------------------ Wetter --
DATA.WEATHER = {
  klar:  { name: "Klar",  icon: "☀", weight: 4, hint: "Keine Auswirkungen." },
  regen: { name: "Regen", icon: "🌧", weight: 3, hint: "Außenorte werden feucht (Salz ↑, Naturgebundene ↑). Anfahrt +2 ÄK." },
  nebel: { name: "Nebel", icon: "🌫", weight: 2, hint: "Außenorte: −1 Scan (schlechte Sicht). Naturgebundene ↑." },
  sturm: { name: "Sturm", icon: "🌩", weight: 1, hint: "Anfahrtskosten verdoppelt." },
};

// ------------------------------------------ Stadtbezirke (generative Namen) --
DATA.DISTRICT_PREFIX = ["Alt-", "Neu-", "Ober", "Unter", "Sankt ", "Groß-", "Klein-"];
DATA.DISTRICT_STEM = ["hafen", "feld", "brück", "loren", "grund", "au", "berg", "wik", "moor", "hall", "linden", "stein"];

// -------------------------------------------------------------- Ausrüstung --
DATA.EQUIPMENT = [
  { id: "emf1", type: "scanner", name: "EMF-Scanner", tier: 1, price: 120,
    diagnostics: "emf", counters: [], charges: null, upgradesTo: "emf2",
    desc: "Erkennt EMF-Muster. Elektrostatik und Symbol-Spuren sind ohne Gerät unsichtbar." },
  { id: "emf2", type: "scanner", name: "EMF-Scanner · Spektralanalyse", tier: 2, price: 200,
    diagnostics: "emf", counters: [], charges: null, upgradesTo: "emf3",
    desc: "Filtert Störsignale – funktioniert auch an elektrifizierten Orten, liest subtile Muster." },
  { id: "emf3", type: "scanner", name: "EMF-Scanner · Phasenfilter", tier: 3, price: 400,
    diagnostics: "emf", counters: [], charges: null, upgradesTo: null,
    desc: "Zeigt beim EMF-Scan zusätzlich die Fraktion der Entität." },
  { id: "thermo1", type: "scanner", name: "Thermokamera", tier: 1, price: 120,
    diagnostics: "thermo", counters: [], charges: null, upgradesTo: "thermo2",
    desc: "Sieht Kältefelder. Schattenformen erfordern ein geschultes Auge oder bessere Optik." },
  { id: "thermo2", type: "scanner", name: "Thermokamera · Langzeit-Heatmap", tier: 2, price: 220,
    diagnostics: "thermo", counters: [], charges: null, upgradesTo: null,
    desc: "Liest auch subtile Signaturen eindeutig; deckt zusätzlich eine visuelle Spur auf." },
  { id: "audio1", type: "tool", name: "Audio-Recorder", tier: 1, price: 100,
    diagnostics: "audio", counters: [], charges: null, upgradesTo: "audio2",
    desc: "Spektrogramm: Klicken, Klagen, Resonanzen." },
  { id: "audio2", type: "tool", name: "Audio-Recorder · Echtzeit-FFT", tier: 2, price: 180,
    diagnostics: "audio", counters: [], charges: null, upgradesTo: null,
    desc: "Audio-Scans kosten nie einen Scan-Punkt und sind eindeutiger." },
  { id: "salz", type: "consumable", name: "Salzsprühgerät", tier: 1, price: 45,
    diagnostics: null, counters: ["salz"], charges: 5, refillPrice: 30,
    desc: "Legt Salzlinien und Bindekreise. 5 Ladungen." },
  { id: "erdung", type: "barrier", name: "Erdungsstangen", tier: 1, price: 110,
    diagnostics: null, counters: ["erdung"], charges: null, upgradesTo: null,
    desc: "Leiten elektrostatische Ladung ab. Synergie mit eisenlastigen Orten." },
  { id: "sigill", type: "projector", name: "Sigill-Projektor", tier: 2, price: 280,
    diagnostics: null, counters: ["stille", "bann", "schutz"], charges: 3, refillPrice: 45, chargeName: "Siegelplatten",
    desc: "Projiziert Rituale: Stille, Bann oder Schutz. Verbraucht Siegelplatten." },
  { id: "laterne", type: "trap", name: "Containment-Laterne", tier: 2, price: 300,
    diagnostics: null, counters: ["laterne"], charges: null, upgradesTo: null,
    desc: "Bindet lichtaffine Geister und Schattenformen." },
  { id: "tuecher", type: "consumable", name: "Spiegeltücher", tier: 1, price: 60,
    diagnostics: null, counters: ["verhuellen"], charges: 3, refillPrice: 40,
    desc: "Verhüllen Spiegel und Reflexionen. 3 Ladungen." },
  { id: "zeitanker", type: "trap", name: "Zeitanker", tier: 3, price: 550,
    diagnostics: null, counters: ["zeitanker"], charges: null, upgradesTo: null,
    desc: "Stabilisiert Zeitversatz, verhindert die Flucht durch Sekundenrisse." },
];

// Experimental-Wards: nur im Labor herstellbar (nie im Shop), max. 3 Ladungen.
// Ein Ward deckt genau eine Methode einmalig ab – die Notlösung, wenn das
// richtige Gerät fehlt, und der zentrale Essenz-Sink des Spätspiels.
for (const [m, def] of Object.entries({
  erdung: "Erdungs", salz: "Salz", schutz: "Schutz", stille: "Stille",
  bann: "Bann", laterne: "Licht", verhuellen: "Schleier", zeitanker: "Zeit",
})) {
  DATA.EQUIPMENT.push({
    id: "ward_" + m, type: "consumable", name: `Experimental-Ward „${def}“`, tier: 1, price: 0,
    diagnostics: null, counters: [m], charges: 3, craftOnly: true,
    desc: `Instabiles Labor-Präparat: wirkt einmalig als ${DATA.METHODS[m].name}.`,
  });
}

// ------------------------------------------------------------ HQ & Räume ----
DATA.ROOMS = {
  garage: {
    name: "Garage / Einsatzzentrale",
    levels: [
      { level: 1, cost: 0,   effect: "Startpunkt. Teamgröße 2." },
      { level: 2, cost: 250, effect: "Teamgröße 3, +1 Auftrag pro Tag im Angebot." },
      { level: 3, cost: 600, effect: "Teamgröße 4. Voll ausgebaute Einsatzzentrale." },
    ],
  },
  werkstatt: {
    name: "Werkstatt",
    levels: [
      { level: 1, cost: 170, effect: "Reparaturen −30 %. Schaltet Tier-2-Ausrüstung frei." },
      { level: 2, cost: 450, effect: "Reparaturen −50 %. Schaltet Tier-3-Ausrüstung frei." },
    ],
  },
  archiv: {
    name: "Archiv",
    levels: [
      { level: 1, cost: 150, effect: "1 Intel-Hinweis pro Auftrag. Ermöglicht Grimoire-Studien (1×/Tag)." },
      { level: 2, cost: 400, effect: "+1 Scan-Punkt pro Einsatz, Fraktionshinweis vorab." },
    ],
  },
  labor: {
    name: "Labor",
    levels: [
      { level: 1, cost: 220, effect: "Essenz-Destillation: Essenzen +50 % Verkaufswert." },
      { level: 2, cost: 500, effect: "Essenzen +100 % Wert, Forschungszuschuss alle 7 Tage (+120 ÄK)." },
    ],
  },
  unterkunft: {
    name: "Unterkunft",
    levels: [
      { level: 1, cost: 160, effect: "Stressabbau 20/Tag (statt 10), leichte Verletzungen heilen doppelt so schnell." },
      { level: 2, cost: 380, effect: "Stressabbau 30/Tag, schwere Verletzungen heilen in 4 statt 6 Tagen." },
    ],
  },
  kapelle: {
    name: "Kapelle",
    levels: [
      { level: 1, cost: 240, effect: "Bann- und Stille-Sigillen +5 % Erfolgschance." },
      { level: 2, cost: 520, effect: "Bann- und Stille-Sigillen +10 % Erfolgschance." },
    ],
  },
};

// ---------------------------------------------------------------- Roster ----
DATA.CLASSES = {
  techniker: { name: "Techniker:in",  wage: 22, primary: "fallen",
    skills: { forschung: 2, fallen: 3, rituale: 0, aufklaerung: 1, sicherheit: 1 } },
  okkultist: { name: "Okkultist:in",  wage: 26, primary: "rituale",
    skills: { forschung: 1, fallen: 0, rituale: 3, aufklaerung: 1, sicherheit: 1 } },
  spaeher:   { name: "Späher:in",     wage: 20, primary: "aufklaerung",
    skills: { forschung: 0, fallen: 1, rituale: 0, aufklaerung: 3, sicherheit: 2 } },
  anker:     { name: "Anker",         wage: 21, primary: "sicherheit",
    skills: { forschung: 0, fallen: 1, rituale: 1, aufklaerung: 0, sicherheit: 3 } },
  sanitaeter:{ name: "Sanitäter:in",  wage: 23, primary: "sicherheit",
    skills: { forschung: 1, fallen: 0, rituale: 1, aufklaerung: 1, sicherheit: 2 } },
};

DATA.SKILL_NAMES = {
  forschung: "Forschung", fallen: "Fallen", rituale: "Rituale",
  aufklaerung: "Aufklärung", sicherheit: "Sicherheit",
};

DATA.HUNTER_NAMES = [
  "Mara Vogt", "Jonas Ferch", "Ilka Brandt", "Selim Aydan", "Theo Grabowski",
  "Nadja Okafor", "Ruth Immel", "Kasimir Falk", "Yuki Sander", "Bela Nowak",
  "Greta Uhl", "Oskar Wende", "Lene Fromm", "Adrian Kessler", "Pia Morgenstern",
  "Emil Drachenberg", "Sana Iqbal", "Viktor Hell", "Franka Dörr", "Milan Petric",
];

DATA.CLIENTS = [
  "Familie Brack", "Stadtwerke", "Pfarramt St. Alwin", "Hafenmeisterei",
  "Museumsdirektion", "Hausverwaltung Nord", "Der Bürgermeister", "Anonymer Anrufer",
  "Nachtwächter-Gilde", "Versicherung Aurora", "Theaterintendanz", "Kliniksverwaltung",
];

DATA.RARITY_MULT = { common: 1, uncommon: 2, rare: 4, epic: 8 };
DATA.RANK_NAMES = { minion: "Schemen", elite: "Elite", boss: "Boss", legend: "Legende", anomalie: "Anomalie" };
DATA.CHANNELS = { emf: "EMF", thermo: "Thermo", audio: "Audio", visuell: "Sinne" };

// ------------------------------------------------- Bibliothek (Fachbücher) --
// Wirtschafts-Sink: ÄK + beliebige Essenzen (die günstigsten werden verbraucht).
// Ein Buch markiert in der Vorbereitung passende Konter mit 📖, wenn die
// Entität tatsächlich eine damit konterbare Eigenschaft trägt.
DATA.LIBRARY = [
  { id: "salt_defense", name: "Salz als kinetische Barriere", price: 150, essences: 2,
    methods: ["salz"], desc: "Bestätigt Salz-Konter gegen Bewegungs- und Wassermuster." },
  { id: "grounding_manual", name: "Handbuch der Erdungslehre", price: 150, essences: 2,
    methods: ["erdung"], desc: "Bestätigt Erdungs-Konter gegen elektrostatische Entitäten." },
  { id: "sigil_studies", name: "Studien zu geweihten Sigillen", price: 220, essences: 3,
    methods: ["bann", "stille", "schutz"], desc: "Bestätigt Sigill-Konter (Bann, Stille, Schutz)." },
  { id: "light_binding", name: "Prismatik und Lichtbindung", price: 200, essences: 2,
    methods: ["laterne"], desc: "Bestätigt Lichtbindung gegen lichtaffine und Schattenformen." },
  { id: "anomaly_codex", name: "Anomalien-Kompendium", price: 300, essences: 4,
    methods: ["verhuellen", "zeitanker"], desc: "Bestätigt Verhüllen und Zeitanker gegen Raum-Zeit-Muster." },
];

// ------------------------------------------------ Eigenheiten (Quirks) ------
// Prozedural bei Rekrutierung; wirken auf die Erfolgschance, wenn der
// Umgebungs-Tag des Einsatzortes passt.
DATA.QUIRKS = [
  { id: "nyktophobie",   name: "Nyktophobie",      tag: "dunkel",     delta: -0.05, desc: "Fürchtet die Dunkelheit (−5 % an dunklen Orten)." },
  { id: "eisenaffin",    name: "Eisen-Affinität",  tag: "eisen",      delta: +0.05, desc: "Vertraut auf kaltes Eisen (+5 % an eisenlastigen Orten)." },
  { id: "wasserscheu",   name: "Wasserscheu",      tag: "damp",       delta: -0.05, desc: "Hasst nasse Füße (−5 % an feuchten Orten)." },
  { id: "kirchgaenger",  name: "Kirchgänger:in",   tag: "sanctified", delta: +0.05, desc: "Ruht in geweihten Mauern (+5 % an geweihten Orten)." },
  { id: "pyrophobie",    name: "Pyrophobie",       tag: "flammable",  delta: -0.05, desc: "Nervös bei offenen Flammen (−5 % an entflammbaren Orten)." },
  { id: "hallenkind",    name: "Hallenkind",       tag: "echoey",     delta: +0.05, desc: "Aufgewachsen im Theater (+5 % an halligen Orten)." },
];

// -------------------------------------------------- Tagesereignisse ---------
// Binäre Entscheidungen; effects: money, rep, stressAll, veilWorst, schleier,
// refillSalz, essence (fügt eine Essenz ins Lager).
DATA.EVENTS = [
  { id: "buergermeister", text: "Der Bürgermeister bittet um eine kostenlose „Reinigung“ seines Amtszimmers – natürlich rein symbolisch, natürlich vor der Presse.",
    a: { label: "Helfen (Material −40 ÄK)", effects: { money: -40, rep: +4, stressAll: +5 } },
    b: { label: "Höflich ablehnen", effects: { rep: -3 } } },
  { id: "fluch", text: "Ein Teammitglied erwacht schreiend – rückwärts sprechend. Die Okkultistin empfiehlt ein Reinigungsritual.",
    a: { label: "Ritual durchführen (−60 ÄK)", effects: { money: -60, stressAll: -10 } },
    b: { label: "„Das ist nur Stress.“", effects: { stressAll: +10 } } },
  { id: "sponsor", text: "Versicherung Aurora bietet Sponsoring – Logo auf dem Einsatzwagen, dafür ÄK. Die Zunft rümpft die Nase.",
    a: { label: "Annehmen (+120 ÄK)", effects: { money: +120, rep: -2 } },
    b: { label: "Ablehnen", effects: { rep: +1 } } },
  { id: "schwarzmarkt", text: "Ein Händler bietet „geweihtes“ Salz zum Spottpreis. Es riecht nach Straßensalz.",
    a: { label: "Kaufen (−30 ÄK, Salz aufgefüllt)", effects: { money: -30, refillSalz: true } },
    b: { label: "Ablehnen", effects: {} } },
  { id: "presse", text: "Die Lokalpresse will eine große Story über den Schleier. Aufmerksamkeit hilft dem Ruf – und schürt Panik.",
    a: { label: "Interview geben", effects: { rep: +3, schleier: +2 } },
    b: { label: "Abwimmeln", effects: { rep: -1 } } },
  { id: "jahrmarkt", text: "Ausgerechnet im schlimmsten Bezirk öffnet ein Jahrmarkt. Menschenmengen und dünner Schleier – eine riskante Mischung.",
    a: { label: "Patrouille stellen (−50 ÄK)", effects: { money: -50, veilWorst: -6 } },
    b: { label: "Nicht unser Problem", effects: { veilWorst: +4 } } },
  { id: "fremder", text: "Ein Fremder im Regenmantel drückt euch wortlos ein Fläschchen in die Hand: eine konservierte Essenz. Dann ist er fort.",
    a: { label: "Behalten (+1 Essenz)", effects: { essence: true } },
    b: { label: "Wegwerfen – zu riskant", effects: { rep: +1 } } },
];

// ------------------------------------ Anomalien (prozedurale Endgame-Geister)
DATA.ANOMALY_PREFIX = ["Flüsternde", "Hohle", "Gierige", "Blinde", "Singende", "Rostige", "Zuckende", "Bleiche"];
DATA.ANOMALY_NOUN = ["Riss", "Echo", "Masse", "Leere", "Wucherung", "Schemen", "Naht", "Spindel"];

// ------------------------------------------------------ Rivalen-Agentur -----
DATA.RIVAL_NAMES = ["Agentur Nachtlicht", "Geisterwacht GmbH", "Van-Holt & Söhne", "Institut Lumen"];

// ---------------------------------------------------- Balancing-Parameter ---
// Zentrale Stellschrauben der Simulation. engine.js liest ausschließlich von
// hier – Balancing-Änderungen passieren also NUR in dieser Datei.
// Baseline kalibriert per Headless-Simulation (siehe simulations/report.md).
DATA.BALANCE = {
  start: { money: 625, rep: 20, schleier: 15 },
  payout: { base: 58, perThreat: 28 },
  penalties: {
    collateralBase: 22, collateralPerThreat: 4,
    failureBase: 12, failurePerThreat: 6,
  },
  chance: { // Erfolgsformel der Ausführung
    base: 0.05, coverage: 0.70, skill: 0.012, dangerPen: 0.018,
    variantCap: 0.15, min: 0.02, max: 0.95,
  },
  collateral: {
    base: 0.12, coverageRelief: 0.15, envRisk: 0.10, sichRelief: 0.02,
    min: 0.02, max: 0.6,
  },
  maintenanceRate: 0.05,
  travel: { base: 4, perDist: 45, rainSurcharge: 2 },
  veil: { expiryBump: 5, failBump: 4, successRelief: 8, ebbChance: 0.3, tickBase: 1 },
  tiers: { // Varianten-Wahrscheinlichkeiten (v = Bezirks-Schleier + Global/2)
    t3: { min: 75, off: 65, div: 80 },
    t2: { min: 38, off: 30, div: 90 },
    t1: { div: 110 },
  },
  grants: {
    emergency: 160, emergencyBelow: 120, emergencyCooldown: 4,
    catastrophe: 100, labor: 120,
  },
  stress: { missionSuccess: 15, missionFail: 30 },
  anomaly: { minVeil: 25, chance: 0.5 },   // Schleierbruch-Spawn
  invasion: { minVeil: 80, chance: 0.5 },   // HQ-Invasion
};

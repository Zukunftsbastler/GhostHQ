Datei: README.md

GhostHQ — Eine narrative Wirtschaftssimulation mit Puzzle-Geisterjagd

Elevator Pitch: Baue aus einer alten Garage ein professionelles Geisterjäger-Hauptquartier auf. Rekrutiere ein Team, rüste es aus, erfülle Aufträge in vielfältigen Spukorten und löse emergente Puzzle-Begegnungen, um Geister zu bannen und die wachsende Bedrohung einer dünner werdenden Schleierwelt aufzuhalten.

Kern-Features
	•	Wirtschaftssimulation: Auftragsverwaltung, Preisgestaltung, Kostenkontrolle, Upgrades (HQ & Equipment), Forschung.
	•	Roster-Management: Rekrutierung, Talente, Verletzungen/Stress, Training, Synergien.
	•	Puzzle-Geisterjagd: Diagnose → Vorbereitung → Ausführung. Eigenschaften von Geist, Ort, Ausrüstung und Team erzeugen emergente Lösungswege.
	•	Skalierende Bedrohung: “Schleierdruck” (globale Gefahr) steigt; erfordert strategische Investitionen.
	•	Narrativ reich: Fraktionen, Hierarchien, Lokationen mit wiedererkennbaren Mustern (für Expert:innen lesbar).

Agentische Umsetzung (Claude Agent SDK)

Diese Mappe liefert .md-Dateien als Spezifikationen, Prompts und Schemas für Agents, die Inhalte generieren, Systeme balancieren und die Produktion koordinieren.

Empfohlene Agenten: (Details in AGENTS.md)
	•	Director, Systems, Economy, Content (Geister & Orte), Equipment, Encounter, Asset-Spec, QA/Playtest, Integrator.

Verzeichnisstruktur (Vorschlag)

/ghosthq
  README.md
  AGENTS.md
  SCHEMAS.md
  ECONOMY.md
  GHOSTS.md
  LOCATIONS.md
  EQUIPMENT_UPGRADES.md
  ENCOUNTER_PUZZLE.md
  PROGRESSION_DIFFICULTY.md
  PIXEL_ART_PIPELINE.md

Architektur-Prinzipien
	•	Datengetrieben: Alle Inhalte via JSON-Schemas (siehe SCHEMAS.md).
	•	Deterministisch+Stochastisch: Begegnungen deterministisch konfiguriert, mit stochastischer Varianz.
	•	Separations of Concerns: Sim-Loop (Wirtschaft), Encounter-Loop (Puzzle), Content (Daten), Rendering (2D, später ersetzbar).

⸻

Datei: AGENTS.md

Agentenübersicht & Prompts (Claude Agent SDK)

Jeder Agent erhält Rolle, Ziele, Inputs, Outputs, Arbeitsregeln, Akzeptanzkriterien.

1) Director-Agent
	•	Rolle: Creative Director & Producer.
	•	Ziele: Projektziele sichern, Abhängigkeiten planen, Tickets erstellen.
	•	Inputs: README.md, ROADMAP (implizit), Änderungswünsche.
	•	Outputs: Aufgabenpakete, Meilensteine, Review-Notizen.
	•	Regeln: Scope wahren, Konsistenz prüfen, Kollisionen zwischen Systemen aufdecken.
	•	Akzeptanz: Alle Deliverables validieren gegen Kern-Features.

2) Systems-Agent
	•	Rolle: Spielsystem-Designer.
	•	Ziele: Sim-Loop und Encounter-Loop formal definieren.
	•	Inputs: ENCOUNTER_PUZZLE.md, PROGRESSION_DIFFICULTY.md.
	•	Outputs: Pseudocode, Zustandsmaschinen, Balancing-Parameter.
	•	Akzeptanz: Läuft als Text-Simulation (ohne Grafik) mit deterministischer Reproduzierbarkeit.

3) Economy-Agent
	•	Rolle: Ökonomie-/Balancing-Designer.
	•	Ziele: Einnahmen-/Ausgaben-Modelle, Preisfunktionen, Progression.
	•	Inputs: ECONOMY.md, SCHEMAS.md.
	•	Outputs: Preislisten, Formeln, Tabellen, Tuning-Vorschläge.
	•	Akzeptanz: Keine Softlocks; Risiko ↔ Reward kuratiert.

4) Content-Agent (Geister)
	•	Rolle: Taxonomie & Instanziierung von Geistern.
	•	Inputs: GHOSTS.md, SCHEMAS.md.
	•	Outputs: Fraktionen, Hierarchien, konkrete Geistdatensätze.
	•	Akzeptanz: Jede Eigenschaft hat lesbare Tells und Konter.

5) Content-Agent (Orte)
	•	Rolle: Orte, Umwelt-Tags, Spawn-Profile.
	•	Inputs: LOCATIONS.md.
	•	Outputs: Lokationsdatensätze mit Environmental Modifiers.
	•	Akzeptanz: Orte “lesbar” für erfahrene Spieler:innen.

6) Equipment-Agent
	•	Rolle: Ausrüstung & HQ-Upgrades.
	•	Inputs: EQUIPMENT_UPGRADES.md, SCHEMAS.md.
	•	Outputs: Items, Upgradepfade, Synergien.
	•	Akzeptanz: Eindeutige Diagnose-/Konter-Schnittstellen.

7) Encounter-Agent
	•	Rolle: Generiert Puzzle-Begegnungen aus Daten.
	•	Inputs: SCHEMAS.md, ENCOUNTER_PUZZLE.md, GHOSTS/LOCATIONS/EQUIPMENT.
	•	Outputs: Konkrete Encounter-Snapshots inkl. Lösungsraum.
	•	Akzeptanz: Mind. 2 valide Strategien, 1 Hard-Counter-Risiko.

8) Asset-Spec-Agent
	•	Rolle: Fordert Pixel-Assets genau an.
	•	Inputs: PIXEL_ART_PIPELINE.md, konkrete Content-Requests.
	•	Outputs: Asset-Briefs (PNG, Auflösung, Frames, Ankerpunkte, Paletten).
	•	Akzeptanz: Minimale Frames, konsistentes Grid.

9) QA/Playtest-Agent
	•	Rolle: Simulierte Testläufe & Heuristiken.
	•	Inputs: Alle Systeme & Content.
	•	Outputs: Bugs, Exploits, Schwierigkeits-Spikes, UX-Feedback.
	•	Akzeptanz: Reproduzierbare Testprotokolle.

10) Integrator-Agent
	•	Rolle: Klebt alles zusammen (Daten, Loops, Tests), erzeugt Builds (textbasiert).
	•	Inputs: Outputs aller anderen.
	•	Outputs: Konsistente Szenarien, Logs, Release Notes.

⸻

Datei: SCHEMAS.md

Kanonische JSON-Schemata (vereinfachte Schreibweise). Agents sollen valide JSON-Daten erzeugen, die diesen Modellen entsprechen.

// GhostFaction
{
  "id": "string",
  "name": "string",
  "theme": "string",
  "affinities": ["environmentTag"],
  "enmities": ["environmentTag"],
  "hierarchy": ["rankId"]
}

// Ghost (Instanz)
{
  "id": "string",
  "name": "string",
  "factionId": "string",
  "rank": "minion|elite|boss|legend",
  "traits": ["traitId"],
  "tells": ["patternId"],
  "resistances": ["damageOrEffectTag"],
  "vulnerabilities": ["damageOrEffectTag"],
  "banishMethod": ["methodTag"],
  "loot": [{"type":"essence|artifact|clue","rarity":"common|uncommon|rare|epic","value":number}],
  "dangerRating": 1,
  "notes": "string"
}

// Location
{
  "id": "string",
  "name": "string",
  "biome": "urban|rural|sacred|industrial|coastal|underground|wilderness",
  "environmentTags": ["damp|iron|salt|runningWater|sanctified|electrified|cluttered|flammable|echoey|dark"],
  "factionBias": [{"factionId":"string","weight":number}],
  "hazards": ["hazardTag"],
  "maxRoomCount": number
}

// Equipment & Upgrades
{
  "id": "string",
  "type": "scanner|trap|projector|barrier|consumable|weapon|tool",
  "name": "string",
  "tier": 1,
  "effects": ["effectTag"],
  "diagnostics": ["patternId"],
  "counters": ["methodTag"],
  "charges": number,
  "synergies": [{"with":"equipmentId|trait|envTag","bonus":"string"}],
  "price": number,
  "upgradesTo": "equipmentId"
}

// Hunter (Roster)
{
  "id": "string",
  "name": "string",
  "class": "techniker|okkultist|späher|anker|sanitäter",
  "skills": {"forschung":0,"fallen":0,"rituale":0,"aufklärung":0,"sicherheit":0},
  "perks": ["perkId"],
  "stress": 0,
  "injury": "none|light|serious",
  "wage": number
}

// HQ & Räume
{
  "id": "string",
  "name": "string",
  "rooms": [{"roomId":"garage|werkstatt|archiv|labor|unterkunft|kapelle","level":1}],
  "bonuses": ["effectTag"],
  "upgrades": [{"roomId":"string","toLevel":2,"cost":number,"requires":["roomId:level"]}]
}

// Contract (Mission)
{
  "id": "string",
  "client": "string",
  "locationId": "string",
  "threatEstimate": 1,
  "payoutBase": number,
  "modifiers": ["noCollateral|rush|publicPlace|multipleEntities"],
  "penalties": {"collateralPerUnit": number, "failure": number},
  "intel": ["hintId"]
}

// Encounter Snapshot (generiert)
{
  "contractId": "string",
  "ghosts": ["ghostId"],
  "rooms": number,
  "environment": ["environmentTag"],
  "puzzle": {
    "diagnosis": ["patternId"],
    "winCons": ["banish|capture|cleanse|seal"],
    "counterplays": [{"trigger":"trait|env","solution":"equipment|method"}],
    "failStates": ["teamWiped|timeOut|collateral"]
  }
}

// Economy Event
{
  "type": "revenue|expense",
  "source": "contract|lootSale|grant|salary|repair|consumables",
  "amount": number,
  "timestamp": "ISO"
}

// SpriteSpec (Pixel-Asset-Anforderung)
{
  "id": "string",
  "category": "hunter|ghost|equipment|tile|fx",
  "canvas": {"tile": 32, "width": 32, "height": 32, "trim": true},
  "anchor": {"x": 16, "y": 28},
  "palette": "GHQ-32",
  "animations": {
    "idle": {"frames": 4, "fps": 6, "loop": true},
    "move": {"frames": 6, "fps": 8, "loop": true},
    "action": {"frames": 6, "fps": 8, "loop": false},
    "vanish": {"frames": 4, "fps": 8, "loop": false}
  }
}


⸻

Datei: ECONOMY.md

Währungen & Flüsse
	•	Currency: “Ätherkredite” (ÄK).
	•	Einnahmen: Vertragsprämien, Bonus für saubere Bannung, Artefaktverkauf, Forschungszuschüsse (Meilensteine), Notfalleinsätze (Rush, höheres Risiko).
	•	Ausgaben: Löhne, Reparaturen, Verbrauchsgüter (Salz, Sigillen), Wartung, Fahrzeugkosten, Raum-Upgrades, Forschung.

Preis-/Payout-Formeln (Vorschläge)
	•	Payout: P = Base * (1 + 0.2*Threat + 0.15*PublicPlace + 0.25*Rush + 0.3*MultipleEntities) * RegionMod
	•	Loot-Wert: Seltenheit: common=1×, uncommon=2×, rare=4×, epic=8× * Basiswert nach Fraktion.
	•	Wartungskosten pro Einsatz: 0.05 * Sum(EquipmentPreisTier).

Progressions-Sicherung
	•	Kein Softlock: Mindestaufträge mit garantierter Netto-Marge.
	•	Catch-Up: Zuschüsse, wenn Schleierdruck hoch, HQ-Level niedrig.

Reputationssystem
	•	Reputation R ∈ [0..100]; schaltet höherwertige Verträge frei; beeinflusst Preisfaktoren ±10%.

⸻

Datei: GHOSTS.md

Fraktionen (Beispiele)
	•	Restlose (Unruhige Tote): Poltergeist, Revenant, Banshee.
	•	Naturgebundene: Irrlicht (Will-o’-the-Wisp), Dryft (Nebelgeborene), Moorfrau.
	•	Anomalien: Schattenriss, Spiegelkind, Zeitzehrer.
	•	Geweihte/Entweihte: Kirchhofwächter, Profanierter Mönch, Yūrei (allg. japanischer Geiststyp, folkloristisch).
	•	Vergessene Geschichten: Weiße Frau, Schwarzer Hund (Schwarzer Schimmelhund), Klagegestalt.

Bezug auf gut beschriebene Folklore-Typen, keine geschützten Markenfiguren.

Hierarchie
	•	Minion → Elite → Boss → Legend (Legend seltene, ereignisgetriebene Aufträge)

Traits (Auszug)
	•	kältefeld, elektrostatik, resonanzschrei, lichtflackern, eisen-schwäche, salz-barriere, heilige-symbole-empfindlich, wasser-bindung, spiegel-übergang, zeitversatz.

Tells & Konter (Muster)
	•	EMF-Muster: Sägezahn (Poltergeist) → Konter: Erdungsstangen.
	•	Thermo: Schnelle Kältefronten (Banshee) → Konter: Sigill-Projektor “Stille”.
	•	Audio-Spektrogramm: Harmonische Lücken (Irrlicht) → Konter: Laterne mit prismatischer Linse.
	•	Ektoplasma-Farbe: Violett (Anomalie) → Konter: Spiegelabdeckung + Salzlinie.

Beispiel-Geister
	1.	Poltergeist der Werkbank (Restlose, Minion)
	•	Traits: elektrostatik, objektwurf, eisen-schwäche
	•	Tells: EMF-Sägezahn, metallisches Klicken
	•	Bannung: Erdung + Bindekreis; Loot: Schraubenschlüssel-Artefakt (common)
	2.	Banshee von Dunhall (Restlose, Elite)
	•	Traits: resonanzschrei, kältefeld, heilige-symbole-empfindlich
	•	Tells: tiefe Temperaturtäler vor Schrei, verzerrtes Audio
	•	Bannung: Sigill “Stille” + Kapellenlicht; Loot: Klangsplitter (rare)
	3.	Irrlichtführer (Naturgebunden, Elite)
	•	Traits: lichtflackern, wasser-bindung
	•	Tells: oszillierende Lichtpunkte über nassem Boden
	•	Bannung: Laterne + Salzsprühung; Loot: Moorfunken (uncommon)
	4.	Spiegelkind (Anomalie, Boss)
	•	Traits: spiegel-übergang, zeitversatz
	•	Tells: Spiegel beschlagen nach innen, rückwärts laufende Fußspuren
	•	Bannung: Spiegel verhüllen + Zeitanker; Loot: Quecksilbersplitter (epic)

⸻

Datei: LOCATIONS.md

Orte & Environmental Tags
	•	Wald (Nadel/Laub): damp, dunkel, echoey, laufwasser — Naturgebundene ↑
	•	Friedhof: sanctified, eisen, dunkel — Restlose & Geweihte/Entweihte
	•	Dachboden: trocken, staubig, cluttered — Poltergeister
	•	Kirche/Kapelle: sanctified, echoey, lichtschächte — Entweihte meiden Symbole, reagieren auf Glocken.
	•	Alte Villa: cluttered, flammable, dunkel — Anomalien möglich.
	•	Krankenhaus alt: elektrifiziert, echoey — Banshees/Klagegestalten.
	•	Leuchtturm: coastal, windig, laufwasser, eisen — Irrlichter, Schwarzer Hund.
	•	Industrieanlage: eisen, elektrifiziert, flammable — Poltergeist-/Anomalie-Mix.
	•	Kanalisation: damp, laufwasser, dunkel — Naturgebundene.
	•	Bunker: eisen, dunkel, echoey — Revenants, Schattenriss.
	•	Bergwerk, Museum, Theater, U-Bahn, Schiffwrack, Windmühle, Kloster, Bibliothek – jeweils mit passenden Tags.

Spawn-Profile (Skizze)
	•	Tabelle pro Ort: Fraktion → Gewicht; Ränge gemäß Schleierdruck.

Lesbare Muster für Profis
	•	Glockenschläge + Temperaturplateaus → Banshee-Nähe.
	•	Flackernde Lampen nur bei Feuchtigkeit → Irrlicht.
	•	Spiegel beschlagen im Windzug → Anomalie (Spiegelkind).

⸻

Datei: EQUIPMENT_UPGRADES.md

Basis-Ausrüstung
	•	EMF-Scanner (scanner, T1): erkennt EMF-Muster; Upgrades: Spektralanalyse (T2), Phasenfilter (T3).
	•	Thermokamera (scanner, T1): Kältefelder/Fronten; Upgrades: Langzeit-Heatmap.
	•	Audio-Recorder (tool, T1): Spektrogramm; Upgrades: Echtzeit-FFT, Richtmikro.
	•	Salzsprühgerät (consumable, T1): legt Barrieren/Verlangsamung.
	•	Erdungsstangen (barrier, T1): leiten Ladung ab; Synergie mit EMF-Scanner.
	•	Sigill-Projektor (projector, T2): projiziert Rituale (Stille, Bann, Schutz). Verbrauch: Siegelplatten.
	•	Containment-Laterne (trap, T2): bindet lichtaffine Geister.
	•	Zeitanker (trap, T3): stabilisiert Zeitversatz, verhindert Flucht.

HQ-Upgrades (Räume)
	•	Werkstatt: Item-Reparatur günstiger, neue Mods.
	•	Archiv: Hinweise generieren (Intel) → bessere Vorhersage.
	•	Labor: Essenzen → Artefakte (Crafting) für Verkauf/Upgrades.
	•	Unterkunft: Stressabbau, Verletzungsheilung.
	•	Kapelle: Stärkere heilige Effekte.

Synergien
	•	Feuchte Orte + Salzsprühgerät ↑ Effekt.
	•	Eisenlastige Orte schwächen Poltergeister (barrier-Effekte verstärkt).

⸻

Datei: ENCOUNTER_PUZZLE.md

Encounter-Loop
	1.	Diagnose: Ort betreten → Sensorik lesen (EMF/Thermo/Audio/Visuell). Muster deuten.
	2.	Vorbereitung: Barrieren/Anker/Sigillen platzieren, Team positionieren.
	3.	Ausführung: Banish/Capture/Seal – Ressourcen & Timing-Checks.
	4.	Nachwirkung: Loot, Reputation, Reparaturbedarf, Hinweise fürs Archiv.

Generationslogik (vereinfacht)

Input: Contract, Location(envTags), Ghosts(traits,tells), Roster(skills), Equipment
Steps:
  pick ghost(s) respecting factionBias & threat
  derive tells := f(traits, envTags)
  propose counterplays := map(traits/env -> equipment methods)
  inject distractions/hazards (≤2) from envTags
  ensure ≥2 viable solution paths; add hint via Intel/Archiv
Output: Encounter Snapshot

Beispiel-Puzzle (Spiegelkind @ Alte Villa)
	•	Tells: beschlagene Spiegel, rückwärts laufende Fußspuren (Talk-back Audio).
	•	Konterpfade:
	•	A) Spiegel abdecken → Salzlinie → Zeitanker → Sigill “Bann”.
	•	B) Zwei Erdungsstangen gegenüber, Sigill “Stille” um Schrei zu verhindern, Containment-Laterne beim Fluchtspiegel.
	•	Fail-Risiken: entflammbares Umfeld (Kerzen), Collateral durch zerbrechliche Antiquitäten.

⸻

Datei: PROGRESSION_DIFFICULTY.md

Schleierdruck (globaler Bedrohungsindex)
	•	Tickt täglich; Einsätze & Fehlschläge erhöhen ihn, erfolgreiche Bannungen senken ihn geringfügig.
	•	Erhöht: Spawn-Ränge, Multi-Entity-Chancen, Rush-Contracts.

Zeit & Eskalation
	•	Kalender mit Öffnungszeiten (Kirchen nachts geschlossen), Wetter (Feuchte ↑ für Naturgebundene).

Roster-Progression
	•	XP/Perks: Skillpunkte; Klassen-spezifische Perks (z.B. Okkultist: Sigill-Fortschritt).
	•	Stress/Verletzung: Längere Auszeiten → Produktionsplanung nötig.

Sichtbare Vermittlung
	•	Stadtkarte: Farbsäume, flackernde Bezirke.
	•	HQ: Risse im Mauerwerk, Radio-Interferenzen, NPC-Dialoge.

⸻

Datei: PIXEL_ART_PIPELINE.md

Ziel: Schlanke, konsistente 2D-Pixel-Assets

Globales Raster
	•	Tilegröße: 32×32 px (Kacheln). Charaktere i.d.R. 32×48 px in 32er-Zellen.
	•	PNG mit Transparenz.
	•	Ankerpunkt: (16, 28) für stehende Figuren (Boden-Kontakt).
	•	Palette: GHQ-32 (32 Farben, frei wählbar; konsistent halten). Dithering erlaubt.

Pflicht-Animationen (Minimal-Frames)
	•	Hunter: idle 4f @6fps, move 6f @8fps, action 6f @8fps, downed 1f.
	•	Ghost: idle 4f, move 6f, attack 6f, vanish 4f.
	•	Equipment (falls animiert): activate 4f.

Dateibenennung

cat_name_variant_state_f##.png z.B. ghost_spiegelkind_default_move_f03.png

Export-Checkliste (Agent ausfüllen)
	•	Canvasgröße, Anker, Frames, FPS, Palette, Schatten (separat?), FX (separat als additive Sprite), Tile-Alignment.

Beispiel-Brief (SpriteSpec)

{
  "id": "ghost_spiegelkind_v1",
  "category": "ghost",
  "canvas": {"tile":32, "width":32, "height":48, "trim":true},
  "anchor": {"x":16, "y":28},
  "palette": "GHQ-32",
  "animations": {
    "idle": {"frames":4, "fps":6, "loop":true},
    "move": {"frames":6, "fps":8, "loop":true},
    "attack": {"frames":6, "fps":8, "loop":false},
    "vanish": {"frames":4, "fps":8, "loop":false}
  }
}

⸻

Datei: STADTKARTE.md

Generative Stadtkarte als Management-Ebene

Die Stadt entsteht deterministisch aus dem Spiel-Seed: 6 benannte Bezirke
(prozedurale Namen aus Präfix+Stamm-Listen), ein mäandernder Fluss, das HQ
und alle Orte mit Koordinaten. Kartenelemente fließen in jede Auftrags-
Entscheidung ein:
	•	Lokaler Schleier pro Bezirk (0..100): steigt, wenn Aufträge im Bezirk
		verfallen oder scheitern; sinkt bei erfolgreichen Bannungen dort.
		Wirkt doppelt: als RegionMod in der Payout-Formel (1 + Schleier/200,
		Gefahrenzulage bis ×1,5) UND als Treiber für Varianten-Stufen.
		Bezirke ab Schleier 80 erhöhen zusätzlich den globalen Schleierdruck.
	•	Anfahrt: Distanz HQ→Ort kostet ÄK (4 + Distanz/45); Eilaufträge an
		fernen Orten kosten einen Scan (späte Ankunft).
	•	Wetter (täglich, seeded): Regen macht Außenorte feucht (Salz ↑,
		Naturgebundene ↑), Nebel kostet an Außenorten einen Scan,
		Sturm verdoppelt Anfahrtskosten.

// District (Schema)
{ "id": "string", "name": "string", "x": 0, "y": 0, "w": 0, "h": 0, "veil": 0 }

⸻

Datei: VARIANTEN.md

Varianten-Stufen (pro Geist-Instanz im Vertrag)

// GhostEntry ersetzt die reine ghostId im Contract/Encounter
{ "id": "ghostId", "tier": 0, "extra": ["traitId"] }

	•	Stufe 0 Grundform, Stufe 1 „Zornige(r)“ (+1 Gefahr, ×1,3 Prämie),
		Stufe 2 „Uralte(r)“ (+2 Gefahr, +1 Fremd-Trait, ×1,7),
		Stufe 3 „Schleiernahe(r)“ (+4 Gefahr, +2 Fremd-Traits, ×2,2).
	•	Fremd-Traits erzeugen zusätzlichen Konter-Bedarf → intensiver Gebrauch
		der Bekämpfungs-Mechanik auch bei bekannten Typen.
	•	Stufen 2/3 sind ohne Grimoire-Wissen (Variantenkunde I/II) nicht
		diagnostizierbar (Scans zeigen „verschleierte Spuren“) und die
		Erfolgschance ist auf 15 % gedeckelt.

⸻

Datei: GRIMOIRE.md

Wissenskomponenten pro Geistertyp (12, sequentiell, kumulative Schwellen)

Quelle: Jede Bannung liefert Essenzproben. Studium im Archiv (1×/Tag,
Punkte = 2 + bester Forschungs-Skill) füllt die Erkenntnis-Leiste.

	1.	Habitat & Reviere (3): Karten-Vermutung, wer hinter einem Auftrag steckt.
	2.	Wirken am Ort (4): eine Spur wird zu Einsatzbeginn aufgedeckt.
	3.	Gefährdungsprofil (6): exakte Bedrohung; Verletzungsrisiko halbiert.
	4.	Spurenkunde (8): keine Verwechslung der Spuren dieses Typs mehr.
	5.	Schwachstellenanalyse (10): nötige Konter werden angezeigt.
	6.	Bannformel (13): +10 % Erfolgschance.
	7.	Verhaltensmuster (16): nach Fehlschlag bleibt der Auftrag bestehen.
	8.	Manifestationszyklus (19): +1 Scan gegen diesen Typ.
	9.	Essenzstruktur (22): Beute +50 %, saubere Bannung +1 Probe.
	10.	Variantenkunde I (26): Stufe-2-Varianten diagnostizier-/bannbar.
	11.	Variantenkunde II (30): Stufe-3-Varianten; +5 % Erfolg.
	12.	Meisterschaft (35): +15 % Erfolg, Kollateralrisiko halbiert.

Jede Komponente trägt einen narrativen Lore-Text ({name}-Platzhalter),
der die Erleichterung in der Spielwelt begründet.

// GrimoireEntry (Schema)
{ "ghostId": "string", "specimens": 0, "points": 0, "unlocked": ["componentId"] }

Progressionskette: leichte Geister bannen → Proben studieren → Varianten
freischalten → stärkere Typen/Bezirke zugänglich machen.

⸻

Datei: DIAGNOSE_SPUREN.md

Spuren, Sinne, Werkzeuge, Fehlerkennung

Jede Eigenschaft (Trait) hinterlässt eine Spur mit:
	•	channel: emf | thermo | audio | visuell
	•	subtlety (1..4): wie schwer die Spur eindeutig zu lesen ist
	•	senses: mit bloßen Sinnen wahrnehmbar (true) oder nur mit Werkzeug
		(false – z. B. Elektrostatik, Symbol-Empfindlichkeit, Schattenform)
	•	confusableWith: Verwechslungspartner auf demselben Kanal, mit
		gemeinsamem Mehrdeutigkeits-Text

Lesbarkeit: clarity = Werkzeug-Tier×2 + ⌊Aufklärung/2⌋ (Sinne zählen als
Tier 1, ab Aufklärung 4 als Tier 2). clarity ≤ subtlety ⇒ der Bericht ist
mehrdeutig („Feld oder Silhouetten?“) – Fehldeutung führt zu falschen
Kontern und damit real zu Fehlschlägen. Ein Rundgang („bloße Sinnen“) mit
Aufklärung ≥ 3 erspürt auch sinnlich wahrnehmbare Spuren fremder Kanäle.

Verdächtigen-Logik: Ein Kodex-Eintrag bleibt verdächtig, wenn alle seine
Basis-Spuren auf vollständig gescannten Kanälen durch Berichte erklärbar
sind; überzählige Berichte schließen nicht aus, sondern werden als
„unerklärte Spur → Variante oder zweite Entität?“ markiert.

Konter-Regel: Nur zum (effektiven) Trait-Set passende Maßnahmen erzeugen
Erfolgschance: P(Erfolg) = 5 % + 70 %·Abdeckung + Skills + Umgebungs-/
Grimoire-Boni − Gefahr. Abdeckung 0 ⇒ ~5 %.

⸻

Datei: VISUALS_GENERATIV.md

Generative 2D-Ebene (Canvas, keine Bild-Assets)

Alle Visuals entstehen prozedural und deterministisch aus IDs/Seed mit
einem vom Spiel-RNG getrennten Zufallsstrom (Visuals beeinflussen nie die
Simulation):
	•	Geister-Sprites: gespiegelte Zufalls-Bitmuster (12×14), eingefärbt
		nach Fraktion, Varianten-Aura nach Stufe – einzigartig & wiedererkennbar.
	•	Jäger-Sprites: 8×12-Pixelfiguren, Mantelfarbe nach Klasse.
	•	Stadtkarte: Bezirke mit prozeduralen Häuserblocks, Fluss, Gebäude-Icons
		nach Biom, Schleier-Dunst (violett) je Bezirk, Wetter-Overlays.
	•	HQ-Querschnitt: Räume mit Ausbaustufen, prozedurales Inventar,
		Jäger-Sprites, Einsatzwagen; ab Schleierdruck 50 violette Risse
		im Mauerwerk (sichtbare Vermittlung gem. PROGRESSION_DIFFICULTY.md).
	•	Einsatzszene: Biom-Hintergrund, Requisiten aus Umwelt-Tags (Kisten,
		Kerzen, Pfützen, Eisenträger …), Team mit Lichtkegeln, platzierte
		Maßnahmen als Glyphen, Entität als Silhouette bis zur Auflösung.

Die PIXEL_ART_PIPELINE.md bleibt gültig als Spezifikation für optionale,
handgefertigte Ersatz-Assets; die generative Ebene ist der Default und
hält den Asset-Bedarf minimal (hoher Wiederspielwert, jede Stadt anders).

⸻

Datei: ONBOARDING_HINWEISE.md

Tutorial-Phase (Tage 1–5) & Known-Unknowns (umgesetzt nach PROMPTS/PROMPT02)

	•	Tutorial (S.flags.tutorialActive, abwählbar im Neues-Spiel-Dialog,
		endet automatisch an Tag 6): nur Einzel-Entitäten der Grundform
		(Schemen-Rang, Tier 0, keine Eile/Multi). Zusätzliche Härtung
		gegenüber der Spezifikation: Tutorial-Geister brauchen höchstens
		EINEN Konter, der der aktuellen Ausrüstung fehlt – und die
		Volloffenlegung benennt dann das fehlende Gerät samt Bezugsquelle.
	•	Volloffenlegung: Auftragskarten und Vorbereitung zeigen die nötigen
		Konter direkt an (bernsteinfarbene Tutorial-Boxen, 🎓).
	•	Known-Unknown-Regel (permanent): Gestörte Scans (elektrifiziert + T1)
		und unscharfe Berichte erklären explizit, WAS Abhilfe schafft
		(T2-Gerät, höhere Aufklärung) – ökonomische Richtung ohne Spoiler.
	•	Hinweis-Framework (Tag 6+), Quellen mit 📖-Markierung an Maßnahmen:
		A) Personal: Aufklärung ≥ 4 liefert Umgebungs-Taktiktipps.
		B) Bibliothek: Fachbücher (DATA.LIBRARY, ÄK + beliebige Essenzen
		   statt spezifischer – verhindert Sackgassen) bestätigen Konter,
		   wenn die Entität tatsächlich passt.
		C) Grimoire: Schwachstellenanalyse bei eindeutiger Identifikation.
	•	Kein Softlock: Routineauftrag bleibt garantiert konterbar.

⸻

Datei: ENDGAME_SYSTEME.md

Umgesetzt nach PROMPTS/PROMPT01 (Sprints 1–8, 10):

	1.	Schleierbrüche (prozedurale Anomalien): Nach der ersten Meisterschaft
		(Grimoire 12/12 eines Typs) reißen in Bezirken mit Schleier ≥ 60
		Anomalien auf. Entitäten werden deterministisch aus ihrer ID
		rekonstruiert (Name, 3–4 Traits, Gefahr) – kein Kodex-Eintrag,
		keine Verdächtigen-Liste, keine Essenzproben: reine Deduktion
		Spur → Konter. Epische Beute, hohe Bezirks-Entlastung.
	2.	Labor-Schmiede: Einweg-Wards (40 ÄK + 3 Essenzen, je Methode, max. 3
		Ladungen) als Konter-Notlösung; permanente Kapazitäts-Mods
		(100 ÄK + 4 Essenzen, 1× pro Verbrauchsgerät). Essenz-Sink.
	3.	Eigenheiten & Vermächtnis: Prozedurale Quirks (60 % bei Rekrutierung)
		wirken ±5 % auf die Erfolgschance bei passendem Umwelt-Tag.
		Ruhestand ab Stufe 5 vererbt +1 Primärskill an den Bewerbungspool
		(die letzten zwei Vermächtnisse gelten).
	4.	HQ-Invasionen: Heimatbezirk-Schleier ≥ 90 → Verteidigungseinsatz in
		der Garage (Spezialort, Anfahrt 0). Ignorieren oder Scheitern
		verwüstet einen zufälligen Raum (Stufe −1).
	5.	Sensornetze: 300 ÄK pro gesichertem Bezirk (Schleier < 30); lösen
		täglich einen kleinen Fall (☠ ≤ 3, Tier ≤ 1) automatisch – 60 %
		Prämie, KEINE Essenzproben (Automation ersetzt keine Forschung).
	6.	Tagesereignisse: ~22 % pro Tag ein binärer Zwischenfall (ÄK,
		Reputation, Stress, Bezirks-Schleier); blockiert den Tageswechsel
		bis zur Entscheidung.
	7.	Rivalen-Agentur: übernimmt bei vollem Brett (≥ 3 offene) mit 30 %
		den lukrativsten Auftrag – erledigt ihn aber auch (Bezirk −4).
		Designabweichung: kein reiner Klau, sondern ein Trade-off.
	8.	Orts-Mutationen: Bezirks-Schleier ≥ 80 → Ort erhält täglich einen
		deterministisch gewürfelten instabilen Umwelt-Tag.
	10.	Szenen-Verfall: Ab Bezirks-Schleier 70 zersetzt sich die
		Einsatzszene sichtbar (Partikel, Risse, Violett-Stich) – der
		Verfall liegt im Hintergrund-Pass, Sprites bleiben freigestellt.

Zurückgestellt: Sprint 9 (mehrstufige legendäre Expeditionen, Prio „Low“) –
erfordert eine Vertragsketten-Statemachine; sauber als Folge-Sprint zu
planen, statt sie in den Einsatz-Loop zu quetschen.
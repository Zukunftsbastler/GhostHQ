# GhostHQ – Balancing-Diagnose & Fixes (Headless-Simulation)

Datum: 2026-07-16 · Umsetzung von `PROMPTS/PROMPT03 -Balancing.md`

## Aufbau

- **Runner:** `simulations/batch.js` lädt `rng.js`/`data.js`/`engine.js` DOM-frei
  (vm-Kontext, identische Ladereihenfolge wie im Browser) und simuliert Tage.
- **Agent:** `simulations/agent.js` – deterministischer, heuristischer Agent, der
  **fair** spielt (nur UI-sichtbare Informationen: Verdächtigen-Liste, Prognose,
  Hinweise, Habitat-Vermutung nur bei Grimoire-Wissen). Er wählt Aufträge nach
  Erwartungswert (Prämie × geschätzte Chance − Strafe − Anfahrt), kauft nach
  Prioritätenplan, studiert „tief vor breit“, platziert Konter gewichtet nach
  Verdächtigen/Beobachtungen/Hinweisen und zieht sich bei Prognose < 33 % zurück.
- **Skalierung:** worker_threads, **bewusst auf 6 Worker gedeckelt** (Ziel:
  Apple M3 Pro, 32 GB); Worker aggregieren lokal und senden nur kompakte Summen
  (kein OOM-Risiko). 1000 Läufe ≈ 2 s.
- **Abbruchkriterien pro Lauf:** Tag 100, Schleierdruck 100 („veil“) oder
  Kontostand < −500 ÄK („bankrott“ – das Spiel selbst kennt keinen
  Bankrott-Zustand; dies ist die Mess-Definition für „effektiv tot“).

Läufe: `node simulations/batch.js --runs 1000 --days 100 --tag <name>`
→ Ergebnisse in `simulations/out/<name>.json`.

## Baseline-Diagnose (1000 Seeds, vor den Fixes)

| Metrik | Wert |
|---|---|
| Tag 100 erreicht | **62,2 %** |
| Effektiv bankrott | **37,3 %** (Ausfall im Median um **Tag ~23**) |
| Schleierbruch (global 100) | 0,5 % |
| Ø Kontostand Tag 10 / 25 | **178 / 237 ÄK** (Messers Schneide) |
| Endkapital P50 der Überlebenden | ~19 500 ÄK (Schneeball) |
| Missions-Erfolgsquote Dekade 1–3 / 8–10 | 74–78 % / 94–95 % |
| Anomalie-/Varianten-/Invasions-Einsätze | 6 / 10 / **0** in 1000 Läufen |

**Engpässe:**

1. **Frühspiel-Todesspirale (Hauptproblem):** Löhne (~55 ÄK/Tag) + Anfahrt +
   Fehlschlagstrafen (20+10·Bedrohung) + Reputationsverlust (senkt künftige
   Prämien) kaskadieren, bevor der Sigill-Projektor (Werkstatt 200 + 320 ÄK)
   die Konter-Abdeckung herstellt. Wer die ersten ~25 Tage übersteht,
   gewinnt fast sicher → stark bimodale Verteilung.
2. **Endgame-Inhalte mathematisch unsichtbar:** Anomalien (Bezirk ≥ 60),
   Invasionen (Heimatbezirk ≥ 90) und Stufe-2/3-Varianten hingen an
   Schleierwerten, die kompetentes Spiel nie erreicht – sie feuerten fast
   ausschließlich in ohnehin verlorenen Läufen.
3. **Kein Spannungsbogen im Spätspiel:** ~95 % Erfolgsquote und im Schnitt
   +250 ÄK/Tag ab Tag 50; Geld verliert Bedeutung (siehe „Offene Punkte“).
4. **Agent-seitig zunächst ignoriert:** Labor-Schmiede (Wards/Mods) – Ursache
   war die Essenz-Verkaufsheuristik des Agenten, nicht die Kosten; nach
   Agent-Fix werden Wards/Mods gekauft. Bücher und Sensornetze werden ab
   Mittelspiel regulär genutzt. Kein Ausrüstungsteil blieb nach dem Fix
   mathematisch „tot“ – am seltensten: Zeitanker (nur 2 Geister mit
   Zeitversatz) und Verhüllen, siehe Methoden-Tabelle im JSON.

## Fixes (ausschließlich `js/data.js`, zentral in `DATA.BALANCE`)

Vorarbeit: Alle Balancing-Konstanten wurden aus `engine.js` in das neue
`DATA.BALANCE` (data.js) gezogen – Baseline-Werte identisch, Regressionstests grün.

| Parameter | vorher | nachher | Wirkung |
|---|---|---|---|
| Startkapital | 500 | **625** | Erstausstattung ohne Vollrisiko |
| Prämien-Basis | 50 | **58** | Frühe Aufträge tragen sich |
| Fehlschlagstrafe | 20+10·B | **12+6·B** | Fehlschlag bestraft ohne Spirale |
| Kollateralstrafe | 25+5·B | **22+4·B** | dito |
| Notzuschuss | 150 ab <100, alle 5 T. | **160 ab <120, alle 4 T.** | Rettungsanker gegen Kaskaden |
| Gefahren-Malus (Chance) | 0,015/Gefahr | **0,018** | dämpft 95-%-Autopilot spät |
| Bezirks-Strafe bei Verfall | +6 | **+5** | Ignorieren straft, kippt aber nicht |
| Varianten-Kurven (t1/t2/t3) | /130, ab 50, ab 85 | **/110, ab 38, ab 75** | Varianten im Normalspiel erlebbar |
| Anomalie-Spawn | Bezirk ≥ 60 | **≥ 25** | Schleierbrüche erreichbar |
| Invasion | Heimat ≥ 90 | **≥ 80** | (bleibt selten, s. u.) |
| T1-Preise | Thermo 150 / Audio 130 / Erdung 140 / Salz 60 / Tücher 80 | **120 / 100 / 110 / 45 / 60** | Diagnose+Konter früher |
| Sigill-Projektor | 320 | **280** | Kern-Freischaltung früher |
| Archiv L1 / Werkstatt L1 | 180 / 200 | **150 / 170** | Kern-Loop ab Tag ~5 |
| Löhne (Klassen) | 25/30/22/24/26 | **22/26/20/21/23** | Fixkosten −11 % |

## Ergebnis (2000 Seeds, nachher)

| Metrik | Baseline | **Final** |
|---|---|---|
| Tag 100 erreicht | 62,2 % | **85,9 %** |
| Effektiv bankrott | 37,3 % | **13,6 %** |
| Schleierfürst gebannt | 62,4 % | **86,1 %** |
| Ø überlebte Tage | 74,1 | **90,9** |
| Ø Kontostand Tag 10 / 25 | 178 / 237 | **228 / 459** |
| Erfolgsquote Dekade 1–3 | 74–78 % | 74–82 % |
| Rückzugsquote | 14,5 % | 8,5 % |
| Anomalie-Einsätze / 1000 Läufe | 6 | **44** |
| Varianten-Begegnungen (gesperrt erkannt) | 305 | **754** |

Die Frühspiel-Erfolgsquote bleibt bewusst bei ~75–80 % – das Puzzle
(Konter müssen passen) wird nicht verwässert; entschärft wurde die
*ökonomische* Bestrafung des Scheiterns.

## Offene Punkte (bewusst nicht in dieser Runde)

1. **Spätspiel-Geldsenke:** Überlebende enden bei ~27 000 ÄK; ab ~Tag 50
   verliert die Ökonomie an Bedeutung. Empfehlung: skalierende Löhne,
   HQ-Unterhalt pro Raumstufe oder Prestige-Investitionen.
2. **HQ-Invasionen feuern weiterhin nie in gesunden Läufen** (Heimatbezirk
   erreicht ≥ 80 nur in Todesspiralen). Empfehlung: einmaliges Skript-Event
   bei globalem Schleierdruck ≥ 70 statt Bezirks-Kopplung.
3. **Agent-Grenzen:** Ruhestand/Vermächtnis nutzt der Agent nicht (bewusst
   nicht implementiert); Quirk-bewusste Teamwahl fehlt. Beide Mechaniken
   sind daher hier nicht bewertet.

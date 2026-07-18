# ECONOMY.md – Mathematische Baseline (v2, simulationsvalidiert)

Diese Datei konkretisiert den Ökonomie-Abschnitt der README mit den aktuell
gültigen Zahlen. **Alle Werte leben in `js/data.js` → `DATA.BALANCE`** (bzw. bei
Preisen/Löhnen direkt an Item/Klasse) – `engine.js` enthält keine
Balancing-Konstanten mehr. Kalibriert per Headless-Simulation
(2000 Seeds × 100 Tage, Details: `simulations/report.md`).

## Währung & Startlage

- Währung: **Ätherkredite (ÄK)**. Start: **625 ÄK**, Reputation 20, Schleierdruck 15.
- Startausrüstung: EMF-Scanner, Salzsprühgerät (5 Ladungen), Erdungsstangen.
- Startteam: Techniker:in (22 ÄK/Tag) + Okkultist:in (26 ÄK/Tag).

## Einnahmen

**Vertragsprämie** (README-Formel, erweitert):

```
P = Basis × (1 + 0,2·Bedrohung + 0,15·Öffentlich + 0,25·Eile + 0,3·Mehrfach)
      × RegionMod × Variantenfaktor × Reputationsfaktor
Basis            = 58 + 28 × Bedrohungseinschätzung
RegionMod        = 1 + Bezirks-Schleier/200        (Gefahrenzulage bis ×1,5)
Variantenfaktor  = 1 / 1,3 / 1,7 / 2,2             (Stufe 0–3)
Reputationsfaktor= 0,9 + 0,2 × Rep/100             (±10 %)
```

- **Bonus saubere Bannung:** +20 % der Prämie.
- **Beute:** Seltenheit ×1/×2/×4/×8 (common…epic) × Fraktions-Basiswert
  (30–50 ÄK); Essenzen +50 %/+100 % mit Labor 1/2, +50 % mit
  Grimoire-„Essenzstruktur“.
- **Zuschüsse:** Notzuschuss **160 ÄK** bei Kasse < 120 (alle 4 Tage),
  Katastrophenfonds 100 ÄK (Schleier > 70 & kleines HQ), Labor-Meilenstein
  120 ÄK alle 7 Tage (Labor 2).
- **Sensornetz-Automation:** 60 % der Prämie, keine Essenzproben.

## Ausgaben

- **Löhne/Tag:** Techniker 22 · Okkultist 26 · Späher 20 · Anker 21 ·
  Sanitäter 23 (+3 je Stufenaufstieg). Antrittsprämie 100 ÄK.
- **Anfahrt:** 4 + Distanz/45 ÄK (Regen +2, Sturm ×2).
- **Wartung pro Einsatz:** 0,05 × Σ Preis der eingesetzten langlebigen Geräte
  (−30 %/−50 % mit Werkstatt 1/2).
- **Strafen:** Fehlschlag **12 + 6·Bedrohung**; Kollateral **22 + 4·Bedrohung**
  pro Einheit (×2 bei „Kein Kollateral“-Klausel).
- **Verbrauch:** Salz-Refill 30, Siegelplatten 45, Spiegeltücher-Refill 40.

## Preisliste (nach Balancing-Runde)

| Gerät | Preis | | Raum (Stufe 1) | Preis |
|---|---|---|---|---|
| EMF-Scanner (T1) | 120 | | Archiv | **150** |
| Thermokamera (T1) | **120** | | Werkstatt | **170** |
| Audio-Recorder (T1) | **100** | | Unterkunft | 160 |
| Salzsprühgerät | **45** | | Labor | 220 |
| Erdungsstangen | **110** | | Kapelle | 240 |
| Spiegeltücher | **60** | | Garage → 2 | 250 |
| Sigill-Projektor (T2) | **280** | | | |
| Containment-Laterne (T2) | 300 | | Bücher | 150–300 + 2–4 Essenzen |
| Zeitanker (T3) | 550 | | Ward (Labor) | 40 + 3 Essenzen |
| EMF T2/T3, Thermo T2, Audio T2 | 200/400/220/180 | | Kapazitäts-Mod | 100 + 4 Essenzen |
| | | | Sensornetz | 300 (Bezirk < 30) |

## Erfolgs- und Risikoformeln

```
Erfolgschance = 0,05 + 0,70·Konterabdeckung + 0,012·Σ(Rituale+Fallen)
                + Umgebungs-/Grimoire-/Eigenheiten-Boni − 0,018·Gefahr
                (geklemmt auf 2–95 %; unbekannte Varianten: max. 15 %)
Kollateral    = 0,12 − 0,15·Abdeckung + 0,10 je Risiko-Tag/Gefahrenquelle
                − 0,02·beste Sicherheit   (2–60 %)
```

## Schleier-Dynamik

- Global: +1/Tag, +1 je Bezirk ≥ 80; Bannung −2 (sauber) / −1; Fehlschlag +3.
- Bezirk: Verfall **+5**, Fehlschlag +4, Erfolg −8, Ebbe −1 (30 %/Tag).
- Varianten (v = Bezirk + Global/2): Stufe 1 p=v/110 · Stufe 2 ab v≥38,
  p=(v−30)/90 · Stufe 3 ab v≥75, p=(v−65)/80.
- Schleierbrüche (Anomalien): ab Bezirk ≥ 25 nach erster Meisterschaft;
  HQ-Invasion ab Heimatbezirk ≥ 80.

## Progressions-Sicherung (validiert)

- Kein Softlock: Routineauftrag stets mit vorhandener Ausrüstung konterbar;
  Zuschüsse fangen Kaskaden ab.
- Simulationsziele der Baseline: ~86 % erreichen Tag 100, ~14 % scheitern
  wirtschaftlich (Spannung bleibt), Frühspiel-Erfolgsquote ~75–80 %,
  Spätspiel ~94 %. Reproduzierbar via
  `node simulations/batch.js --runs 2000 --tag check`.

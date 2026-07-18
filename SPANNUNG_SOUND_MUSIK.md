# SPANNUNG_SOUND_MUSIK.md — Spannungs-, Sound- & Musik-Konzept für GhostHQ

Status: Konzept (v1, 2026-07) · Ziel-Technologie: **Vanilla JS / HTML5 (Web Audio API + Canvas/CSS), null externe Dependencies, null Audio-Assets** — alles wird zur Laufzeit synthetisiert, passend zur generativen Grafik-Ebene des Projekts.

---

## 0. Leitplanken (gelten für alles Folgende)

1. **Juice ist Zusatz, nie tragend.** Spannungseffekte veredeln funktionierende Mechanik; sie ersetzen nie Information. Jede Inszenierung ist überspringbar (Klick/Leertaste) und global abschaltbar („Sofort-Modus“).
2. **Ehrliche Spannung, keine Dark Patterns.** Wir inszenieren *echte* Wahrscheinlichkeiten und *echte* knappe Ausgänge. Keine gefälschten Near-Misses, keine „Losses disguised as wins“, keine künstlichen Warteschleifen außerhalb des Spannungsrituals. (Wir nutzen die Psychologie der Spielautomaten — nicht ihre Ethik.)
3. **Determinismus-Grenze.** Audio/FX konsumieren **nie** den Spiel-RNG. Eigener Zufallsstrom (wie `gfx.js`: `Gfx.rng`-Muster), geseedet aus IDs/Tag — dieselbe Bannung klingt reproduzierbar gleich.
4. **Barrierefreiheit.** `prefers-reduced-motion` deaktiviert Shake/Flacker; Flacker-Effekte ≤ 3 Ereignisse/s (Photosensitivität); Lautstärke-Regler getrennt für Musik/SFX, Default moderat; alles Wichtige bleibt ohne Ton lesbar.
5. **Datengetrieben.** Alle Cues, Instrumente, Patterns und Zustands-Mappings leben in `DATA.AUDIO` (`data.js`). Neue Features (künftige Erweiterungen) definieren nur Daten + ein Zustands-Mapping — kein neuer Audio-Code.

---

## 1. Psychologisches Fundament (Warum das funktioniert)

| Befund | Konsequenz für GhostHQ |
|---|---|
| Dopamin belohnt **Antizipation/Erwartung**, nicht primär den Gewinn; Vorfreude kann stimulierender sein als die Belohnung selbst | Die Zeit **zwischen** „Bannung ausführen“ und Ergebnis ist unser wertvollster Moment — sie bekommt eine eigene Dramaturgie (Spannungsritual, §2) |
| **Near-Miss-Effekt:** knappe Fehlschläge aktivieren Gewinn-Schaltkreise und erhöhen die Motivation weiterzumachen | Knappe *echte* Fehlschläge werden als solche inszeniert („Der Bindekreis hielt fast!“) — inkl. Retry-Anreiz über das bestehende Verhaltensmuster-Wissen |
| Spielautomaten strecken die Auflösung (langsamer werdende Walzen, anschwellender Sound, verzögertes Ergebnis) | Auflösungs-Verzögerung skaliert mit dem Einsatz (Stakes), niemals fix — Routine bleibt schnell, Bosse zelebrieren |
| **Juice/Game Feel:** Hitstop (60–80 ms), Screenshake, gestapelte Feedback-Ebenen (Bild+Ton+Partikel) lassen Konsequenzen „landen“ | Peak-Momente stapeln 3+ Feedback-Kanäle synchron; Fehlschläge bekommen *weniger*, dumpferes Feedback (Kontrast erzeugt Wert) |
| **Verlustangst/Streaks:** Zerbrechliches erzeugt Spannung (Saubere-Serie existiert bereits in `S.stats.cleanStreak`) | Die saubere Serie wird hör-/sichtbar: je länger, desto fragiler klingt ihr Motiv — Verlust wird betrauert, nicht bestraft |
| **Habituation:** identische Reize nutzen sich ab | Abnutzungs-Regel: Wiederholte gleichartige Rituale verkürzen sich automatisch (§2.4) |

---

## 2. Das Spannungsritual (zentrale Abstraktion)

Ein **Ritual** ist der generische 5-Phasen-Ablauf für jede aufgelöste Ungewissheit. Es ist EIN wiederverwendbarer Mechanismus mit Parametern — nicht pro Feature neu gebaut.

```
Ritual = { stakes: 0..1, kind: cueFamilie, resolve: () => Ergebnis, skippable: true }

Phase        Dauer (Basis × stakes)   Bild                          Ton
1 SETUP      0,2–0,4 s               Fokus: Abdunkeln, Vignette     Musik duckt (−6 dB), Sub-Drone setzt ein
2 AUFBAU     0,6–2,2 s               Puls-Vignette (Herzschlag),    Herzschlag-Kick beschleunigt (60→120 BPM),
                                     Nadel/Sigill lädt sichtbar     Riser (Pitch-Slide aufwärts), Ticken verdichtet
3 PEAK       60–80 ms                HITSTOP: Standbild,            Stille (!) — 1 Frame Audio-Loch vor dem Schlag
                                     letzter Funke
4 AUFLÖSUNG  0,3–0,8 s               Erfolg: Partikelburst, Shake   Erfolg: Impact + Auflösungs-Akkord (Motiv, §5)
                                     Fehlschlag: Farbentzug, Riss   Fehlschlag: gedämpfter Tiefschlag, Motiv abwärts
5 NACHKLANG  0,5–1,5 s               Beute/Zahlen tröpfeln einzeln  Zähl-Ticks, Hall klingt aus, Musik kehrt zurück
```

### 2.1 Einsatzorte & Stakes-Formeln (konkret, erweiterbar)

| Moment (Engine-Hook) | stakes = | Besonderheit |
|---|---|---|
| **Bannungs-Roll** (`Engine.execute`) | `0,3 + 0,4·(1−chance) + 0,3·min(1, danger/10)` | Der Hauptmoment. Volles Ritual |
| **Scan-Ergebnis** (`Engine.scan`) | `0,2 + 0,1·subtlety` | Kurzform (nur Phasen 2–4, ≤ 1 s): Messrauschen → Ausschlag → Tell erscheint zeilenweise |
| **Grimoire-Studium** (`Engine.study`) | `0,3`; `0,8` wenn Freischaltung bevorsteht | Seiten-Rascheln; bei Unlock: Ritual mit Siegelbruch-Inszenierung |
| **Loot-Aufdeckung** (Nachwirkung) | `0,2·raritätsstufe` | Karten flippen einzeln, rare/epic mit eigenem Sting |
| **Tagesereignis erscheint** | `0,4` | Radio-Knacken → Stimme (Formant-Noise), kein Ergebnis-Roll |
| **Varianten-/Anomalie-Enthüllung** | `0,9` | Verschleierte Spuren „reißen auf“: Rückwärts-Riser |
| *(zukünftig: beliebig)* | Daten-Eintrag in `DATA.AUDIO.rituals` | Neue Features registrieren nur `{kind, stakesFn}` |

### 2.2 Near-Miss-Inszenierung (ehrlich)

Kleine Engine-Erweiterung: `Engine.execute` legt den tatsächlichen Wurf ins Ergebnis (`R.roll`). Definition: **Near-Miss ⇔ Fehlschlag ∧ (roll − chance) < 0,07**. Dann: Auflösung zeigt die Nadel *sichtbar knapp* vor der Erfolgsschwelle stehen bleiben, Ton endet auf Halbschluss (Dominante ohne Auflösung — die Harmonielehre-Entsprechung von „fast!“). Niemals umgekehrt (kein Erfolg als Beinahe-Fehlschlag inszenieren, keine erfundene Knappheit).

### 2.3 Kontrast-Regel

Erfolge sind laut, hell, dreifach gestapelt (Bild+Ton+Partikel). Fehlschläge sind **leiser** als das Ritual davor: Entzug statt Bestrafung. Der Wert des Erfolgs entsteht durch die Fallhöhe.

### 2.4 Abnutzungs-Regel (Anti-Habituation)

Pro Ritual-`kind` zählt ein Session-Zähler: Dauer der Aufbauphase × `max(0,4; 0,9^n)` bei gleichem Kontext (gleicher Geisttyp, ähnliche Stakes). Bosse, Anomalien, Legende und erste Begegnungen setzen den Zähler außer Kraft. Skip bricht sofort zur Auflösung durch (nie zum Ergebnis-Spoiler davor).

---

## 3. Grafische Spannungs-Effekte (Canvas/CSS, generativ)

Alle Effekte als kleine, kombinierbare Bausteine in `js/fx.js` (analog `gfx.js`, eigener Zufallsstrom):

| Baustein | Technik | Einsatz |
|---|---|---|
| **Vignette-Puls** | radialer Gradient-Overlay, Opacity an Herzschlag-Tempo gekoppelt | Aufbauphase; Tempo = Spannungsträger |
| **Hitstop** | `requestAnimationFrame`-Pause 60–80 ms + eingefrorenes Canvas | Peak; verkauft den Schlag |
| **Screenshake** | CSS-Transform auf Szenen-Canvas, Amplitude · e^(−t·8), max. 6 px | nur Erfolge/Impacts, nie UI-Panels |
| **Partikelburst** | 40–120 Punkte, Farbpalette = Fraktionsfarbe des Geists | Auflösung Erfolg |
| **Farbentzug** | Canvas-Filter `saturate(0.4)` für 0,5 s | Auflösung Fehlschlag |
| **Zähl-Tröpfeln** | Zahlen inkrementieren einzeln (80 ms/Schritt, beschleunigend) | Nachklang: Prämie, XP, Beute |
| **Sigill-Ladekreis** | prozeduraler Kreisbogen, Segmente füllen sich unregelmäßig (nicht linear! die letzten 10 % langsamer) | Aufbau — die „langsamer werdende Walze“ |
| **Licht-Flackern** | Szenen-Beleuchtung ±, hart limitiert ≤ 3/s | Varianten-/Anomalie-Momente |

`prefers-reduced-motion` ⇒ Shake/Flacker/Hitstop aus, Dauern halbiert; Information (Ergebnis, Zahlen) identisch.

---

## 4. Audio-Architektur (`js/audio.js`, Web Audio API pur)

```
AudioContext (lazy, nach erster User-Geste — Autoplay-Policy)
 └─ MasterGain ── DynamicsCompressor ── destination
     ├─ MusicBus (Gain)  ← Ducking-Automation (Rituale senken auf −6…−12 dB)
     └─ SfxBus  (Gain)
```

- **Scheduler:** Lookahead-Muster nach Chris Wilsons „A Tale of Two Clocks“: `setInterval` 25 ms prüft, plant alles innerhalb 100–120 ms Lookahead **sample-genau** via `audioContext.currentTime`. Ein Scheduler für Musik *und* getimte Ritual-Cues (Herzschlag synchron zum Vignette-Puls: beide vom selben Taktgeber).
- **SFX-Synthese „GhqFX“:** Eigener Nachbau des ZzFX-Prinzips (MIT-lizenziert, Nachbau unproblematisch; Attribution im Quelltext-Kommentar): ein parametrischer Mini-Synth (~1 KB) mit Wellenform (Sinus/Rechteck/Säge/Noise), Frequenz + Pitch-Slide, ADSR-Hüllkurve, Tremolo/Bitcrush, gerendert in einen `AudioBuffer`. Jeder Sound = ein Parameter-Array in `DATA.AUDIO.cues` — versionierbar, diffbar, generativ.
- **Geister-Klangsignaturen:** Wie die Sprites deterministisch aus der Geist-ID: Basis-Parameter der Fraktion + seeded Detune/Timbre-Abweichung pro ID. Varianten-Stufen fügen eine Aura hinzu (Ringmodulation zunehmend). Anomalien: absichtlich „falsch“ gestimmte Cluster (Vierteltöne).

### 4.1 Sound-Familien (Auszug, je 2–4 Parameter-Presets)

| Familie | Charakter | Beispiele |
|---|---|---|
| `ui` | trocken, kurz, leise | Klick, Tab, Kauf (Münz-Doppelklick), Fehler (dumpf) |
| `scan.emf` | Geigerzähler: unregelmäßige Klicks, dichter bei Fund | Scan-Start, Ausschlag, Störsignal (verzerrtes Brummen) |
| `scan.thermo` | Sub-Whoosh, absinkender Sinus | Kältefeld-Fund = tiefes Atmen |
| `scan.audio` | Bandmaschine: Rauschen, Rückspulen, Stimmen-Fetzen (Formant-Noise) | mehrdeutiger Fund = zwei überlagerte Fetzen |
| `scan.sinne` | Atem, Herzschlag, Raumton | „keine Auffälligkeit“ = ein einzelner beruhigter Ausatmer |
| `ritual.*` | Riser, Herzschlag, Ticken, Impact, Fail-Thud | §2 |
| `ghost.*` | Signatur pro Geist (s. o.): Erscheinen, Schrei, Vanish | Vanish = Signatur rückwärts + Hall |
| `stadt.*` | Wetter-Betten (Regen-Noise, Wind), Bezirks-Warnung | Karte; Schleier ≥ 80: entferntes Sirren |

---

## 5. Musik-Konzept: Leitmotiv, Harmonik, Schlagzeug

### 5.1 Das GhostHQ-Leitmotiv (Wiedererkennbarkeit)

Konstruktion aus der Harmonielehre, mit gemeinfreiem Rohmaterial, aber eigener Schöpfungshöhe:

- **Rohmaterial:** Der Kopf des *Dies irae* (gregorianisch, 13. Jh., gemeinfrei; F–E–F–D) — das kulturell gelernte „Todes-Kürzel“ der Filmmusik (The Shining, LotR, Star Wars …). Wir zitieren es **nicht**, wir verarbeiten es:
  1. **Umkehrung** der ersten Wendung (aus Abwärts- wird Aufwärtsseufzer): D–E–D–F
  2. **Rhythmische Verschiebung** in einen 7/8-Auftakt (das „Stolpern“ = etwas ist nicht geheuer)
  3. **Eigener Schluss:** Quintfall D→G mit anschließender ♭2 (Es) — die ♭2 über dem Grundton ist unser „Schleier-Ton“.
- **Ergebnis-Signatur (merkbar):** `D–E–D–F | D–G–Es–D` — vier Takte, singbar, in 10 Sekunden erkennbar. Diese Intervallfolge (Sekundpendel → Quartsprung/Quintfall → ♭2-Rückfall) ist die **Motiv-DNA**; jede Variation muss mindestens Sekundpendel + ♭2-Rückfall behalten.
- **Harmoniegerüst:** d-dorisch (wie das Original-Dies-irae — hell genug für „Firma mit Herz“, dunkel genug für Geister). Kadenz-Grundlage: **andalusische Kadenz** i–♭VII–♭VI–V (Dm–C–B–A), das klassische Spannungs-Ostinato; der Phrygisch-Dominant-Schluss (A mit ♭2-Umspielung) koppelt an den Schleier-Ton.

### 5.2 Motiv-Familie (Variationen = Wiedererkennung + Abwechslung)

| Kontext | Transformation des Leitmotivs |
|---|---|
| HQ/Zentrale | Dur-Umdeutung (F-lydisch), halbes Tempo, Marimba-artig — „Zuhause“ |
| Stadtkarte | Motiv als Bass-Ostinato unter Wetter-Bett |
| Einsatz-Diagnose | Nur Motiv-Fragmente (2 Töne), nie vollständig — Unvollständigkeit = Ungewissheit (Zeigarnik) |
| Fraktionen | Restlose: äolisch/Streicher-Pad · Naturgebundene: mixolydisch/Flöten-Sinus · Anomalien: Ganzton-Verfremdung · Geweihte: Quintorganum · Vergessene: Spieluhr (verstimmt +12 ct) |
| Schleierfürst/Anomalien | Motiv im **Tritonus** transponiert (As statt D) — der „diabolus in musica“ als Endgegner-Chiffre |
| Sieg | Motiv in D-Dur, ♭2 wird zur reinen 2 „geheilt“ — die einzige Stelle, an der der Schleier-Ton aufgelöst wird |

### 5.3 Adaptive Struktur (Vertical Layering + Horizontal Resequencing)

- **Vertikal:** 5 Layer, per Gain an Taktgrenzen ein-/ausgeblendet:
  `L0` Drone/Bett → `L1` Bass-Ostinato (andalusisch) → `L2` Puls (Hats/Ticken) → `L3` Motiv-Stimme → `L4` Volles Schlagzeug + Gegenstimme.
  **Intensitäts-Mapping (datengetrieben):** `intensity = max(schleier/100, bezirksschleier/120, missionPhase)` — Zentrale ≤ L1, Karte L1–L2, Diagnose L2–L3, Vorbereitung L3, Ausführung → Ritual übernimmt, Nachwirkung Erfolg L4 (kurz), Fehlschlag L0.
- **Horizontal:** Szenenwechsel re-sequenzieren an der nächsten Taktgrenze (nie hart schneiden); Übergangs-Fill (1 Takt Schlagzeug) kaschiert den Schnitt.
- **Renderer:** Eigener Mini-Tracker nach dem ZzFXM-Prinzip (MIT; Nachbau): Song = `{instruments: GhqFX-Presets, patterns: Notennummern, sequence: Patternfolge}` als Daten in `DATA.AUDIO.songs`. Kein Sample, keine Datei.

### 5.4 Schlagzeug & der „Banger“

- **Kit (synthetisiert):** Kick = Sinus 150→45 Hz Drop (60 ms) · Snare = Noise-Burst + 180-Hz-Body durch Bandpass · Hats = Hochpass-Noise 6 kHz (closed 30 ms/open 200 ms) · Tom = Sinus-Drop mit Resonanz · **Ritual-Herzschlag** = Kick-Doppel (ta-dumm) mit ansteigendem Tempo.
- **Patterns nach Intensität:** L2 = Herzschlag-Puls · L3 = Half-Time (Snare auf 3) · L4 = treibendes 7/8+4/4-Wechselpattern (das Motiv-Stolpern im Groove).
- **„Geisterjagd“ (der Banger, Titel/Sieg/Legende):** 104 BPM Darksynth: Säge-Bass auf andalusischem Ostinato, Sidechain-Pumping (Gain-Automation auf Kick-Raster — der „atmende“ Club-Effekt), Half-Time-Drop nach 8 Takten (alles weg außer Sub + Motiv, dann voller Einsatz), Schlussteil doppeltes Tempo-Gefühl durch Hat-Verdichtung. Im normalen Spielbetrieb läuft er **nicht** — Seltenheit macht ihn zum Ereignis.

---

## 6. Integrations-API (abstrakt, zukunftssicher)

```js
// js/audio.js — Fassade; Aufrufer kennen nur Semantik, nie Synthese:
Audio.cue("scan.emf.fund", { stakes, seedId });      // SFX abfeuern
Music.setState({ scene: "mission", intensity: 0.6, faction: "anomalien" });
Tension.ritual({ kind: "bannung", stakes, skippable: true,
                 resolve: () => Engine.execute(S) })  // Ritual kapselt Delay+FX+Audio,
  .then((R) => UI.renderResult(R));                   // Engine bleibt unangetastet synchron
```

- Die Engine bleibt **DOM- und audiofrei** (Headless-Tests/Simulationen unverändert); `ui.js` ruft `Tension.ritual` statt `Engine.execute` direkt.
- Neue Inhalte/Features liefern nur Daten: Cue-Presets, Motiv-Variante, Ritual-Registrierung. Akzeptanzkriterium für jede künftige Erweiterung: *„Kein neuer Code in audio.js/fx.js nötig?“*
- Einstellungen (`localStorage`): Musik-/SFX-Lautstärke, Sofort-Modus, Reduced-Motion-Override.

## 7. Umsetzungsfahrplan

1. **Phase A – Fundament:** `audio.js` (Context, Busse, Scheduler, GhqFX-Synth), `fx.js` (Vignette, Hitstop, Shake, Partikel), Settings-UI. *Akzeptanz: 10 Cues hörbar, Ritual-Dummy läuft, Tests unberührt.*
2. **Phase B – Spannungsritual:** Bannungs-Roll + Scan + Loot verdrahtet, `R.roll`/Near-Miss in Engine, Abnutzungs-Regel. *Akzeptanz: Ritualdauer skaliert mit Stakes; Skip überall.*
3. **Phase C – Musik:** Mini-Tracker, Leitmotiv + 3 Szenen-Songs, Layering an Spielzustand. *Akzeptanz: Motiv in HQ/Karte/Mission erkennbar; Übergänge nur an Taktgrenzen.*
4. **Phase D – Banger & Feinschliff:** „Geisterjagd“, Fraktions-Varianten, Geister-Signaturen, Mix-Pass (Kompressor/Ducking-Werte). *Akzeptanz: Sieg fühlt sich wie ein Konzertfinale an.*

## 8. Quellen & Lizenzlage

- **Game Feel/Juice:** valdemird.com „Game feel on the web“; GameJuice „Juice it or Lose it“ (Hitstop 60–80 ms, Screenshake, Feedback-Stacking, Streak-Decay).
- **Antizipation/Near-Miss:** Clark et al., *Neuron* 2009 (PMC2658737): Near-Misses rekrutieren Gewinn-Schaltkreise; Winstanley et al., *Neuropsychopharmacology* 2011: Dopamin moduliert Gewinnerwartung; Slot-Design streckt Auflösungen gezielt.
- **Web-Audio-Scheduling:** Chris Wilson, „A Tale of Two Clocks“ (web.dev): 25 ms-Timer + ~100 ms Lookahead. Technik, kein schutzfähiges Werk — Nachbau frei.
- **Synthese-Vorbilder (Nachbau erwogen):** **ZzFX** (Frank Force) und **ZzFXM** (Keith Clark) — beide **MIT-Lizenz**; wir bauen die Prinzipien eigenständig nach (Parameter-Synth, Tracker-Format) und nennen die Inspiration im Quelltext. Tone.js (MIT) nur als Architektur-Referenz — als Dependency zu schwer.
- **Musikalisches Rohmaterial:** *Dies irae* (gregorianischer Choral, 13. Jh.) — **gemeinfrei**; unsere Verarbeitung (Umkehrung, Metrumwechsel, eigener Schluss) schafft ein eigenständiges Werk. Andalusische Kadenz, Modi, Tritonus-Symbolik: freie Allgemeingüter der Harmonielehre.
- **Keine Samples/Assets:** vollständig generativ ⇒ keine fremden Leistungsschutzrechte im Spiel.

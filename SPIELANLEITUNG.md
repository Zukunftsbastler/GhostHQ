# GhostHQ – Spielanleitung

**Starten:** `index.html` im Browser öffnen (Doppelklick genügt – kein Server, kein Build nötig).
Der Spielstand wird automatisch im Browser gespeichert. „Neues Spiel“ erlaubt einen frei
wählbaren Seed – gleicher Seed bedeutet exakt dieselbe Stadt und derselbe Spielverlauf.

## Ziel

Baue die Garage zu einem professionellen Geisterjäger-HQ aus und banne den **Schleierfürsten**,
bevor der **Schleierdruck** 100 erreicht (dann reißt der Schleier – Niederlage).
Der legendäre Auftrag erscheint bei Reputation ≥ 60 oder Schleierdruck ≥ 75 – im Bezirk
mit dem dichtesten lokalen Schleier.

## Die Stadtkarte (Management-Ebene)

Die Karte ist generativ: Bezirke, Fluss, Ortslagen und Namen entstehen aus dem Seed.
Jede Auftragsentscheidung hängt an Kartenfaktoren:

- **Lokaler Schleier** (violetter Dunst je Bezirk): bringt Gefahrenzulage
  (+bis zu 50 % Prämie), erzeugt aber **stärkere Varianten**. Verfallene und
  gescheiterte Aufträge verdichten ihn; Erfolge lichten ihn. Bezirke ab Schleier 80
  treiben den globalen Druck zusätzlich – wer Bezirke ignoriert, verliert die Stadt stückweise.
- **Anfahrt**: Entfernung vom HQ kostet ÄK; bei Eilaufträgen kostet eine weite
  Anfahrt einen Scan (späte Ankunft).
- **Wetter**: Regen macht Außenorte feucht (Salz ↑, Naturgebundene ↑), Nebel
  kostet draußen einen Scan, Sturm verdoppelt die Anfahrtskosten.

## Der Tageszyklus

1. Ort auf der Karte anklicken, Auftrag prüfen (Bedrohung, Bezirk, Anfahrt, Modifikatoren).
2. Team entsenden (Teamgröße hängt vom Garage-Ausbau ab).
3. **Nächster Tag**: Löhne, Heilung, Stressabbau, neues Wetter, Schleier-Tick, neue Aufträge –
   und einmal pro Tag ein **Grimoire-Studium** (Archiv nötig).

Es gibt immer einen garantierten **Routineauftrag**, der mit der vorhandenen Ausrüstung
konterbar ist – ein Softlock ist ausgeschlossen; bei knapper Kasse springen Zuschüsse ein.

## Der Einsatz (Encounter-Loop)

1. **Diagnose:** Scans (EMF/Thermo/Audio) und der **Rundgang mit bloßen Sinnen** decken Spuren auf.
   - Manche Spuren sind **nur mit Werkzeug** lesbar (EMF-Muster, Schattenformen).
   - Subtile Spuren sind **verwechselbar** („Feld oder Silhouetten?“) – hohe Aufklärung,
     bessere Geräte (T2) oder Grimoire-**Spurenkunde** machen sie eindeutig.
   - Die Verdächtigen-Liste zeigt alle Kodex-Einträge, die zu den Berichten passen.
     „Unerklärte Spuren“ deuten auf eine **Variante** oder zweite Entität.
2. **Vorbereitung:** Konter platzieren. **Nur zum Geist passende Maßnahmen zählen** –
   ohne passende Konter liegt die Erfolgschance bei ~5 %. Fehldeutung = falsche Konter = Fehlschlag.
3. **Ausführung:** Erfolgschance = Konter-Abdeckung + Team-Skills + Umgebungs-/Grimoire-Boni − Gefahr.
4. **Nachwirkung:** Prämie, Beute, **Essenzproben fürs Grimoire**, Reputation, Bezirks-Schleier.

**Rückzug** ist vor der Ausführung jederzeit möglich (nur die Anfahrt ist verloren).

## Das Grimoire (Wissen = Progression)

Jede Bannung liefert **Essenzproben**. Im Archiv wird pro Tag eine Probe studiert
(Punkte = 2 + bester Forschungs-Skill). Pro Geistertyp gibt es **12 Wissenskomponenten**,
jede mit narrativer Begründung – von *Habitat & Reviere* (Karten-Vermutungen) über
*Spurenkunde* (keine Verwechslung), *Schwachstellenanalyse* (Konter werden angezeigt) und
*Bannformel* (+10 %) bis zur *Meisterschaft*.

**Varianten**: In Schleier-Bezirken erscheinen *Zornige* (Stufe 1), *Uralte* (Stufe 2,
+fremdes Trait) und *Schleiernahe* (Stufe 3, +2 fremde Traits) Varianten – mit deutlich
höherer Prämie. Stufe 2/3 sind ohne **Variantenkunde I/II** nicht diagnostizierbar
(verschleierte Spuren) und praktisch unbannbar (Chance ≤ 15 %). Die Kernschleife:
leichte Geister bannen → studieren → schwerere Varianten und Typen erschließen.

## Einstieg & Hinweise

- **Tutorial (Tage 1–5, abwählbar):** Nur einfache Grundform-Geister, und die
  Ausbilderin verrät die nötigen Konter direkt – inklusive Einkaufsberatung,
  falls ein Gerät fehlt. Ab Tag 6 gilt der Ernstfall.
- **Known Unknowns:** Gestörte oder unscharfe Messungen erklären immer, *was*
  Abhilfe schafft (besseres Gerät, mehr Aufklärung) – nie, *wer* spukt.
- **Hinweise im Hauptspiel** (📖 an den Maßnahmen): erfahrene Späher:innen
  (Aufklärung ≥ 4) geben Umgebungstipps, **Fachbücher** aus der Bibliothek
  (ÄK + Essenzen) bestätigen passende Konter, und die Grimoire-
  **Schwachstellenanalyse** nennt sie bei eindeutiger Identifikation.

## Spätspiel & Stadtleben

- **Schleierbrüche:** Nach eurer ersten Grimoire-Meisterschaft reißen in
  Hochschleier-Bezirken **prozedurale Anomalien** auf – Entitäten, die in
  keinem Kodex stehen. Keine Verdächtigen-Liste, keine Studien: Ihr müsst die
  Spuren selbst auf Konter abbilden. Epische Beute wartet.
- **Labor-Schmiede:** Überschüssige Essenzen werden zu Einweg-**Wards**
  (einmalige Konter-Notlösung) oder permanenten **Kapazitäts-Mods** verschmiedet.
- **Eigenheiten & Vermächtnis:** Jäger:innen haben Quirks (±5 % je nach
  Umgebung). Ab Stufe 5 können sie in den **Ruhestand** gehen und vererben
  +1 Primärskill an künftige Bewerbungen.
- **HQ-Invasionen:** Kippt euer Heimatbezirk (Schleier ≥ 90), dringen
  Entitäten in die Garage ein – verteidigt noch am selben Tag, sonst wird
  ein Raum verwüstet (Stufe −1).
- **Sensornetze:** In gesicherten Bezirken (Schleier < 30) automatisieren
  300 ÄK kleine Fälle – 60 % Prämie, aber keine Essenzproben.
- **Zwischenfälle:** Binäre Tagesereignisse (Bürgermeister, Presse, Flüche …)
  wollen entschieden werden, bevor der nächste Tag beginnt.
- **Konkurrenz:** Eine Rivalen-Agentur schnappt sich liegengebliebene,
  lukrative Aufträge – und senkt dabei immerhin den Bezirks-Schleier.
- **Instabile Orte:** Ab Bezirks-Schleier 80 mutieren Orte täglich um einen
  zusätzlichen Umwelt-Tag – Standard-Loadouts reichen dann nicht mehr.

## Tipps

- **Archiv zuerst**: ohne Archiv keine Studien, kein Intel.
- **Späher:innen** lesen Spuren klarer und erspüren beim Rundgang auch Hörbares/Fühlbares.
- An **elektrifizierten** Orten ist der T1-EMF-Scanner nutzlos – erst die Spektralanalyse hilft.
- „Keine Auffälligkeiten“ auf einem Kanal ist Information: sie schließt Geister aus.
- Hochschleier-Bezirke zahlen am besten – aber erst hinfahren, wenn das Grimoire so weit ist.
- Misserfolge und verfallene Aufträge füttern den Schleier; saubere Bannungen senken ihn.

## Technik

- Vanilla HTML/CSS/JS, keine Abhängigkeiten, läuft per Doppelklick (`file://`).
- `js/data.js`: alle Inhalte (Geister, Spuren, Orte, Wissen, Wetter) gemäß Schemas der README.
- `js/engine.js`: DOM-freier Sim- und Encounter-Kern (headless testbar).
- `js/gfx.js`: rein **generative** Canvas-Grafik (Sprites, Stadtkarte, HQ, Einsatzszene) –
  deterministisch aus Seed/IDs, mit eigenem Zufallsstrom getrennt von der Simulation.
- `js/ui.js`: Rendering und Interaktion.
- Seeded RNG (mulberry32) im Spielstand – Läufe sind vollständig reproduzierbar.

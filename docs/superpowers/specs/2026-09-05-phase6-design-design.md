# Phase 6 – Design: Design-Spec

**Referenz:** `docs/superpowers/specs/2026-09-05-phase6-referenzdesign-analyse.md` — Frame-für-Frame-Analyse eines vom Nutzer bereitgestellten Referenzvideos, mit exakt per Pixel-Sampling gemessenen Farbwerten. Dieser Spec übernimmt die dort gemessenen Werte 1:1 und legt fest, wie sie auf VitaLoop angewendet werden.

**Entschieden (Brainstorming-Sitzung 05.09.2026):**
- Umfang: strukturelle **und** visuelle Änderungen erlaubt, nicht nur Umfärben.
- Home-Dashboard bleibt Platzhalter — kein Teil dieser Phase (braucht eigenes Datenmodell für Trainingstag/Restday, eigenes Vorhaben).
- Nur Dark Mode, kein Light Mode.
- Exakte Farbwerte aus dem Referenzvideo übernehmen, keine eigene Farbwelt.
- Kein erhöhter zentraler „+"-Button in der Navigation — die bestehenden „Hinzufügen"-Buttons auf den einzelnen Seiten bleiben als Seiten-Aktionen, werden aber im neuen Stil gestaltet.

## Ziel

Training, Ernährung, Körper und die drei Analyse-Seiten bekommen ein durchgestaltetes, konsistentes visuelles Design nach dem Vorbild des Referenzvideos — Karten statt Listenzeilen, eine feste Farbpalette, größere Typografie, natives `<dialog>` für Popups. Home bleibt unangetastet.

## Technische Basis (neu gegenüber dem bisherigen Stack)

- **Tailwind CSS** (aktuelle Version, `@theme`-Direktive statt `tailwind.config.js`) — ersetzt `src/index.css`s Custom-Properties-Ansatz. Erste neue Abhängigkeit seit Projektstart, bewusst entschieden (siehe Brainstorming).
- **lucide-react** für alle Icons (Navigation, evtl. Buttons) — MIT-lizenziert, deckt alle benötigten Symbole ab.
- **Natives `<dialog>`-Element** für alle Popups/Sheets — kein eigenes Modal-System. `::backdrop` mit `backdrop-filter: blur(...)` für den Weichzeichner-Effekt aus dem Referenzvideo. `showModal()`/`close()` aus der Plattform, kein State-Management für „ist offen" nötig.
- Die App hatte bisher **keine einzige CSS-Klasse** (reine Element-Selektoren). Diese Phase ist ein vollständiger Neuaufbau des Stylings, keine inkrementelle Anpassung.

## Design-Tokens

Alle Farbwerte sind aus dem Referenzvideo gemessen (siehe Referenzdokument Abschnitt 2), nicht approximiert.

```css
@theme {
  --color-bg: #181920;           /* Seiten-Hintergrund */
  --color-surface: #23242b;      /* Karten */
  --color-surface-raised: #414249; /* Nav-Pille, hervorgehobene Flächen */

  --color-accent: #8766ed;       /* Primärakzent: Buttons, aktive Icons, CTAs */
  --color-success: #ebfd6e;      /* Erfolgsmeldungen, aktive Toggle-Zustände */
  --color-success-ink: #17181f;  /* Text auf --color-success (immer dunkel, nie weiß) */
  --color-danger: #f27a6b;       /* Fehlermeldungen — gedämpftes Rot, eigene Ergänzung, im Video nicht vorhanden */

  --color-text: #fefeff;         /* Headings, Primärtext */
  --color-text-muted: #5e5f66;   /* Labels, Sekundärtext */

  --color-chart-mint: #6efde6;   /* Hauptmetrik/Trend einer Zeitreihe */
  --color-chart-blue: #4f6ca5;   /* Vergleichs-/Rohwert daneben */
  --color-chart-green: #49be69;  /* dritte Kategorie in Mehrserien-Charts */
  --color-chart-orange: #ff6f43; /* vierte Kategorie; auch für hervorgehobene Ausreißer */
  --color-chart-violet: #8766ed; /* fünfte Kategorie in Mehrserien-Charts — identisch mit --color-accent */
  --color-chart-grid: #5e5f66;   /* neutrale Referenz-/Nulllinien, Gridlines — nie eine Akzentfarbe */
}
```

**Radius-Skala:** Karten `rounded-3xl` (24px), Buttons/CTAs `rounded-2xl` (16px), Chips/Nav-Pille `rounded-full`.

**Typografie:** System-Font-Stack bleibt (`system-ui, 'Segoe UI', Roboto, sans-serif`), aber Zahlen/Kennwerte auf Karten bekommen durchgehend `font-bold` und eine eigene, größere Textgröße gegenüber dem Kartentitel — nicht nur Größe, auch Gewicht macht den Unterschied (siehe Referenzdokument Abschnitt 3).

## Kernkomponenten

Jede Komponente wird **einmal** gebaut und überall wiederverwendet — kein Bereich bekommt eine eigene Variante.

### Karte
Dunkle Fläche (`bg-surface`), `rounded-3xl`, kein Rahmen, großzügiger Innenabstand (`p-5`/`p-6`). Ersetzt jede aktuelle `<li>`-Zeile mit `border-bottom`, wo heute gruppierte Werte stehen.

### Button (CTA)
Volle Breite bei Hauptaktionen (Speichern, Scannen, Heute eintragen), `rounded-2xl`, `bg-accent`. Sekundäre/Text-Buttons (z. B. „Abbrechen") bleiben unauffälliger, ohne Akzentfarbe.

### Navigation
Schwebende Pille am unteren Bildschirmrand (`bg-surface-raised`, `rounded-full`, Abstand zum Bildschirmrand), vier lucide-react-Icons: `House` (Home), `Dumbbell` (Training), `UtensilsCrossed` (Ernährung), `Activity` (Körper). Aktiver Tab: Icon in `--color-accent`, inaktive in `--color-text-muted`. Kein fünftes/erhöhtes Element.

### Formularfelder
Jedes Feld eine eigene Karte (wie im Referenzvideo-„Log"-Screen), nicht mehr durch Rahmenlinien getrennte Zeilen.

### Chips
`rounded-full`, kleine Pillen für Mehrfachauswahl und für den Zeitraum-Umschalter (30/90/365/alles wird zur Chip-Reihe). Aktiver Zustand: `bg-accent`.

### Popup / Sheet
Natives `<dialog>`, geöffnet über `showModal()`. `::backdrop` mit `backdrop-filter: blur(8px)` und leichter Abdunkelung. Der Dialog-Inhalt selbst besteht aus einzelnen Karten (nicht einer langen Karte). Schließen-Button als eigener runder Button **unterhalb** des Dialog-Elements, nicht als X oben rechts im Dialog.

### Toast
Von oben einblendend, volle Breite minus Außenabstand, `rounded-2xl`. Erfolg: `bg-success` mit `text-success-ink`. Fehler: `bg-danger` mit hellem Text (eigene Ergänzung, im Referenzvideo nicht vorhanden — es zeigt nur den Erfolgsfall). Ersetzt die aktuellen inline `<p role="alert">`-Meldungen dort, wo es sich um eine kurzlebige Rückmeldung auf eine Aktion handelt (z. B. „Eintrag gespeichert"); permanente Validierungsfehler in Formularen bleiben inline.

## Farbzuordnung für alle 19 Graphen

Regel: Hauptmetrik/Trend → Mint. Vergleichs-/Rohwert daneben → Blau. Referenz-/Nulllinien → `--color-chart-grid` (neutral), nie eine Akzentfarbe — Ausnahme: ein einzelner hervorgehobener Ausreißer darf Orange bekommen, wie der Balken im Referenzvideo. Mehrserien-Charts (mehr als zwei Datenreihen) nutzen die 5er-Palette (Mint, Blau, Grün, Orange, Violett) in fester, deterministischer Reihenfolge.

**Training:**
- T1 Trainingsfrequenz (Balken, eine Serie) → Mint
- T2 Kraftverlauf je Übung (Linie) → Mint
- T3 Volumen je Übung (Balken) → Mint
- T4 Bestes Satzgewicht (Linie) → Mint
- T5 Wiederholungen je Satz → Mint
- T6 Volumen je Muskelgruppe (mehrere Kategorien) → 5er-Palette zyklisch, Reihenfolge nach erstem Auftreten der Muskelgruppe in den Daten (keine feste Namensliste, da `muskelgruppen_primaer` freier Text ist)
- T7 Dauer und Kalorien je Session (zwei Serien) → Dauer Mint, Kalorien Blau
- T8 Persönliche Rekorde → Liste, keine Chart-Farben

**Ernährung:**
- E1 Kalorien pro Tag gegen Ziel → Kalorien Mint, Ziel-Linie `--color-chart-grid`
- E2 Makro-Verteilung heute (Eiweiß/Kohlenhydrate/Fett) → Eiweiß Mint, Kohlenhydrate Blau, Fett Grün
- E3 Makro-Verlauf (dieselben drei über Zeit) → identische Zuordnung wie E2, für Wiedererkennbarkeit
- E4 Kalorien je Mahlzeiten-Abschnitt (bis zu 6 Balken) → 5er-Palette zyklisch nach Abschnitts-Reihenfolge
- E5 Wochenschnitt (Balken, eine Serie) → Mint
- E6 Kalorienbilanz (eine Serie, Nulllinie) → Mint, Nulllinie `--color-chart-grid`

**Körper:**
- K1 Gewichtsverlauf mit Trendlinie → Trend Mint (Hauptlinie), Rohgewicht Blau (Vergleichswert)
- K2 Umfänge im Verlauf (5 Serien) → Bauchumfang Mint, Beinumfang Blau, Armumfang Grün, Rückenumfang Orange, Brustumfang Violett (Reihenfolge exakt wie `MEASUREMENT_FIELDS` ohne `gewicht`/`koerperfettanteil`)
- K3 Änderungsrate (eine Serie, Nulllinie) → Mint, Nulllinie `--color-chart-grid`
- K4 Gewicht über Kalorien (Punktwolke, Nulllinie) → Punkte Mint, Nulllinie `--color-chart-grid`
- K5 Fortschrittsfotos → Liste, keine Chart-Farben

## Struktur je Bereich

Kurzbeschreibung der strukturellen Änderungen; die genaue Datei-für-Datei-Umsetzung folgt im Implementierungsplan.

- **Körper-Dashboard:** die sieben Messwerte werden zu einer 2-spaltigen Karten-Grid (analog Glucose/Pills/Activity/Carbs im Referenzvideo) statt der aktuellen langen `<ul>`-Liste.
- **Ernährungs-Dashboard:** Mahlzeiten-Einträge werden Karten statt Listenzeilen. Der Barcode-Scan-Button bleibt die zentrale Aktion, jetzt im neuen Button-Stil.
- **Trainingsbereich:** Pläne und Übungen als Karten. Der Satz-Eintrag im Live-Modus übernimmt das Log-Screen-Muster (Kategorie-Kontext oben, Kartenfelder darunter, breiter CTA-Button unten für „Satz abschließen").
- **Alle drei Analyse-Seiten:** Zeitraum-Umschalter wird zur Chip-Reihe. Graphen bekommen die neue Farbpalette (siehe oben) und eine Karten-Umrandung um jeden einzelnen Graphen (heute: nackte `<section>`-Elemente ohne Hintergrund).
- **Home:** unverändert, bleibt Platzhalter.

## Global Constraints

- Keine Drittanbieter-Namen aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- Neue Abhängigkeiten in dieser Phase ausdrücklich erlaubt und entschieden: Tailwind CSS, lucide-react. Keine weiteren neuen Abhängigkeiten ohne erneute Rücksprache (kein Modal-/Toast-/Chip-Framework — die drei genannten Komponenten werden selbst gebaut, siehe „Kernkomponenten").
- `<dialog>` statt eigenem Modal-State — native Plattformfunktion nutzen.
- Bestehende Barrierefreiheits-Konventionen bleiben erhalten: `role="list"` auf Listen, 44px Mindest-Tastziel, `env(safe-area-inset-bottom)` auf der Nav-Pille.
- Home-Dashboard wird nicht angefasst.
- Graph-Tests weiterhin gegen gezeichnete Marken prüfen, nie gegen Achsentexte oder Farben (Farbwerte sind ein visuelles Detail, keine Testgrundlage).

## Nicht in diesem Spec

- Home-Dashboard-Inhalt (eigenes künftiges Vorhaben).
- App-Icons/PWA-Manifest (gehört zu „PWA-Feinschliff", Phase 7).
- Light Mode (bewusst nicht entschieden für diese Phase).

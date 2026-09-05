# Referenzdesign-Analyse für Phase 6 (VitaLoop Design)

**Quelle:** vom Nutzer bereitgestelltes Video (`original-3735dd65e03e83c2a88808c611a05afb.mp4`, 21 Sekunden, App-Demo-Loop eines Glukose-/Gesundheits-Trackers). Analysiert per Frame-Extraktion (ffmpeg, 2 fps, 42 Frames) und Pixel-Sampling (Python/Pillow) für exakte Farbwerte — keine Schätzung nach Augenmaß.

**Zweck dieses Dokuments:** Referenzpunkt für alle folgenden Design-Entscheidungen in Phase 6. Beschreibt, was im Video zu sehen ist, mit exakten Werten. Die Übertragung auf VitaLoops eigene vier Bereiche (Training, Ernährung, Körper, Analyse) folgt im eigentlichen Design-Spec, der auf diesem Dokument aufbaut.

**Keine Drittanbieter-Namen:** Das Referenzvideo zeigt eine Diabetes-/Glukose-Tracking-App mit fiktiven Nutzerdaten ("Emily Ashley"). Der App-Name selbst ist im Video nicht zu sehen und wird hier nicht genannt oder vermutet — nur das visuelle Design wird beschrieben.

---

## 1. Beobachteter Bildschirm-Flow

Das Video ist ein 21-Sekunden-Loop, der folgende Stationen zeigt:

1. **Statische Dreier-Ansicht** (Start- und Endpunkt des Loops): drei Handy-Screens nebeneinander — "Insights" (Analyse-Seite), Home-Dashboard ("Hi, Emily!"), "Profile".
2. **Home-Dashboard** → Tap auf den zentralen "+"-Button in der Tab-Leiste.
3. **"Log"-Screen**: horizontale Kategorie-Auswahl (Glucose/Medicine/Carbs/A1C/Exercise), darunter Formularkarten (Time, Blood Glucose, Tags), unten ein großer CTA-Button.
4. **Datum/Zeit-Popup**: Bottom-Sheet-artiges Overlay über unscharfem (`backdrop-filter: blur`) Hintergrund, mit "Select a day" / "Select time"-Karten und einem separaten runden Schließen-Button unterhalb der Sheet-Karte.
5. Zurück im Log-Screen, Zahlenwert eintragen (natives iOS-Nummernfeld).
6. **Erfolgs-Toast**: knallige gelb-grüne Pille von oben eingeblendet, schwarzer Text, Info-Icon links.
7. Zurück zur Dreier-Ansicht, Loop beginnt von vorn.

## 2. Farbpalette (exakt gemessene Werte)

Alle Werte per Pixel-Sampling aus den Video-Frames, nicht geschätzt.

| Rolle | Hex | Beschreibung |
|---|---|---|
| Seiten-Hintergrund | `#15161c`–`#181920` | Fast Schwarz, minimal kühler Blauton, kein reines `#000` |
| Karten-Oberfläche | `#202129`–`#23242b` | Ein Grauton heller als der Hintergrund — einzige Elevation-Stufe, kein drittes Grau beobachtet |
| Nav-Leiste (Pille) | `#414249` | Nochmal spürbar heller als Karten — die untere Tab-Leiste hebt sich klar vom Rest ab, wirkt wie eine schwebende Kapsel |
| **Primärakzent (Buttons, FAB, CTA)** | `#8766ed` | Mittleres Violett/Lila, keine Farbverläufe, volle Deckkraft |
| **Sekundärakzent (Erfolg, aktive Auswahl)** | `#e8f68c`–`#ebfd6e` | Knalliges Gelb-Grün/Limette. Text darauf ist near-black (`#17181f`), nie weiß |
| Chart-Farbe „positiv/nach dem Essen" | `#63f4da`–`#6efde6` | Helles Aqua-Mint, sehr gesättigt |
| Chart-Farbe „neutral/vor dem Essen" | ~`#4f6ca5` | Gedämpftes Indigo/Stahlblau, deutlich weniger gesättigt als die Mint-Linie — bewusster Kontrast zwischen den zwei Datenreihen |
| Chart-Farbe „im Normalbereich" (Balken) | `#49be66`–`#49be69` | Sattes Grün, *nicht* identisch mit dem Mint-Ton der Linien — ein separates, wärmeres Grün für Balken/Ring |
| Chart-Farbe „Warnung/über Normalbereich" (Balken) | `#ff6f43` | Warmes Orange-Rot, nur für den einen auffälligen Balken verwendet |
| Primärer Text (Headings) | `#fefeff` | Reines, warmes Weiß |
| Sekundärer Text (Labels, Captions) | `#5e5f66`–`#414249` | Gedämpftes Grau, deutlich abgesetzt vom Weiß, nie schwarz-auf-dunkel |

**Beobachtung zur Systematik:** Es gibt genau **zwei Akzentfarben** (Lila für Aktionen/Interaktion, Gelb-Grün für Erfolg/aktive Zustände) und **vier Datenfarben** für Charts (Mint, Blau, Grün, Orange) — keine Farbe wird doppelt für zwei unterschiedliche Bedeutungen verwendet. Das Farbschema ist strikt dunkel; im Video ist zu keinem Zeitpunkt ein heller/weißer Hintergrund zu sehen.

## 3. Typografie

- Sehr große, fette Headings (z. B. "Hi, Emily!", "36%", "10:49") — deutlich über der Größe, die VitaLoop aktuell nutzt (56px `h1` in `index.css`, hier wirkt es eher wie 32–40px innerhalb der Handy-Breite, aber mit sehr hohem Kontrast durch Fettschrift statt durch Größe allein).
- Kartentitel ("Blood Sugar", "Eaten") mittel-fett, Label-Text ("Avg this week") dünn/grau in kleinerer Schrift daneben in derselben Zeile — Muster: **Titel links, Kontextwert rechts, in einer Zeile**.
- Zahlenwerte (36%, 522 cal, 10:49) immer die visuell dominanteste Type auf der Karte, oft in einer eigenen größeren/fetteren Schriftgröße als der Rest der Karte.
- Kein sichtbares Serifen- oder Display-Schriftbild — reine, neutrale Grotesk-Schrift (System-Font-artig, vergleichbar mit dem, was VitaLoop schon nutzt: `system-ui, 'Segoe UI', Roboto, sans-serif`).

## 4. Layout- und Komponentenmuster

### Karten (überall)
- Durchgängig **stark abgerundete Ecken** (geschätzt 20–24px Radius — deutlich runder als VitaLoops aktuelle 6px-Buttons).
- Innenabstand großzügig (~20–24px), nie eng.
- Karten schweben ohne sichtbaren Rahmen (`border`) — Abgrenzung nur durch den Helligkeitsunterschied zum Hintergrund, kein Schlagschatten erkennbar.
- Zwei-Spalten-Grid für kleine Metrik-Karten (Glucose/Pills, Activity/Carbs) — je zwei Karten nebeneinander, Icon als Emoji oben rechts in der Karte.

### Ring-/Fortschrittsdiagramm
- Donut-Ring, dick (~12–14% des Durchmessers als Strichstärke), mit rundem Endkappen-Punkt (`stroke-linecap: round`), nicht scharf abgeschnitten.
- Prozentzahl groß zentriert im Ring, sonst nichts.
- Grauer Rest-Track in derselben Kartenfarbe wie der Hintergrund, kaum sichtbar — der Ring wirkt dadurch wie „in die Karte eingelassen", nicht wie ein separates Element.

### Liniendiagramme
- Kein Bereichs-Fill unter der Linie (kein `area`-Chart) — reine Linien mit sichtbaren Punktmarkern an jedem Datenpunkt.
- Zwei Datenreihen im selben Chart (before/after meal), per Legende mit farbigem Punkt + Label darüber unterschieden, nicht per Achsentitel.
- Dünne, kaum sichtbare horizontale Gridlines, keine vertikalen.
- Y-Achsen-Beschriftung links in großen, klaren Schritten (0/40/80/120/160), X-Achse mit Wochentags-Kürzeln.
- Monotone/geglättete Kurvenführung (Bézier-artig), keine geraden Liniensegmente zwischen Punkten.

### Balkendiagramm
- Schmale, stark abgerundete Balken (Radius nur oben, wie „Pillen").
- Ein einzelner Balken sticht farblich hervor (orange = „above normal"), alle anderen einheitlich grün — Farbe wird gezielt für **einen** Ausreißer eingesetzt, nicht gleichmäßig verteilt.

### Bottom Navigation
- Fünf Elemente: Home, Balken-Chart, **erhöhter zentraler Kreis-Button (+, Primärfarbe, größer als die anderen vier)**, Chat/Nachrichten, Profil.
- Die Leiste selbst ist eine abgerundete, schwebende „Pille" (nicht randlos wie VitaLoops aktuelle `nav`), mit sichtbarem Abstand zum Bildschirmrand.
- Nur Icons, keine Text-Labels unter den Icons.

### Formulare / Eingabe-Screens ("Log")
- Horizontale, scrollbare Kategorie-Auswahl oben: runde Icon-Chips (Emoji im Kreis), aktive Kategorie durch farbigen Kreis-Hintergrund (hier: die Gelb-Grün-Akzentfarbe) hervorgehoben, inaktive in neutralem Dunkelgrau.
- Jedes Formularfeld ist eine eigene abgerundete Karte, nicht durch Linien getrennte Zeilen wie bei VitaLoop aktuell (`<li>` mit `border-bottom`).
- Chip-Style für Tags (mehrfach wählbar, „Add new" mit Plus-Icon als erste Chip in der Reihe).
- Ein einzelner, sehr breiter, sehr auffälliger CTA-Button unten (volle Breite minus Außenabstand, Primärfarbe, stark abgerundet — kein scharfkantiges Rechteck wie VitaLoops aktuelle Buttons).

### Popup / Bottom-Sheet
- Hintergrund dahinter wird **weich geblurrt und abgedunkelt** (`backdrop-filter: blur`), nicht nur mit einem halbtransparenten schwarzen Overlay wie üblich — der Inhalt dahinter bleibt schemenhaft erkennbar.
- Das Sheet selbst besteht aus mehreren einzelnen Karten (Select a day / Select time), nicht aus einer einzigen langen Karte.
- Segmented Control (AM/PM) als zwei nebeneinanderliegende, abgerundete Rechtecke, aktiver Zustand in der Gelb-Grün-Akzentfarbe mit dunklem Text.
- Schließen-Button (X) liegt **außerhalb** und unterhalb der Sheet-Karte als eigener kleiner Kreis-Button, nicht als X-Icon oben rechts in der Karte selbst.

### Toast / Erfolgsmeldung
- Erscheint oben am Bildschirmrand (nicht unten, nicht als Snackbar über der Nav), volle Breite minus Außenabstand.
- Grelle Akzentfarbe (Gelb-Grün) statt eines neutralen Grautons — Erfolg wird durch eine auffällige, nicht dezente Farbe kommuniziert.
- Info-Icon (schwarzer Kreis mit „i") links, Text zweizeilig rechts daneben, kein Schließen-Button sichtbar (verschwindet vermutlich automatisch).

## 5. Was sich davon direkt auf VitaLoop übertragen lässt

Bewertung, keine Entscheidung — die tatsächliche Übernahme wird im Design-Spec pro Bereich festgelegt:

- **Direkt übertragbar, unabhängig vom Bereich:** die generelle dunkle Farbwelt, die zwei-Akzentfarben-Systematik, das Karten-Elevation-Modell (ein Hintergrund, eine Kartenebene, eine hellere Nav-Pille), die Ring- und Liniendiagramm-Optik (passt gut zu VitaLoops bereits vorhandenen Recharts-Graphen K1/K3/E1 etc.), das Toast-Muster für Erfolgsmeldungen, das Bottom-Sheet-Muster für Formular-Popups.
- **Braucht Anpassung an VitaLoops Struktur:** die Fünf-Icon-Nav mit zentralem "+"-Button passt nicht 1:1 — VitaLoop hat vier Bereiche (Training/Ernährung/Körper/Analyse-ist-kein-eigener-Tab, sondern Unterseite), keinen einzelnen "Log"-Flow, der alle Bereiche bedient. Eine Umsetzung braucht eine eigene Entscheidung, ob der zentrale "+"-Button bereichsübergreifend (z. B. kontextabhängig je nach aktivem Tab) oder gar nicht übernommen wird.
- **Nicht im Referenzvideo zu sehen, für VitaLoop aber nötig:** Light-Mode (das Referenzdesign ist ausschließlich dunkel; VitaLoops `index.css` hat aktuell einen `prefers-color-scheme: dark`-Block, der Rest ist hell-first), Formulare mit vielen Feldern (Body-Einträge mit sieben Werten, Ernährungs-Produktformulare mit acht Nährwerten) — das Referenzdesign zeigt nur sehr kurze Formulare (max. 3 Felder).

## 6. Offene Fragen für den eigentlichen Design-Spec

- Nur Dark Mode wie im Referenzvideo, oder zusätzlich ein Light Mode?
- Wie wird der zentrale "+"-Button-Gedanke auf vier separate Bereiche mit jeweils eigenen Eintragsflüssen übertragen?
- Exakte Farbwerte übernehmen oder nur die Systematik (zwei Akzente, vier Chart-Farben) mit eigenen VitaLoop-Tönen (z. B. passend zum Namen "VitaLoop")?

# P1-Fixes aus dem Critique-Re-Run — Design

**Spec-Datum:** 10.09.2026

## Ziel

Der Critique-Re-Run vom 07.09.2026 (siehe „Critique-Re-Run + Feature-Wünsche" in `CLAUDE.md`) hat drei P1-Befunde erbracht, die nach den bereits erledigten P0-Punkten (Home-Dashboard, Login) jetzt dran sind:

1. Die App ist app-weit zentriert (`text-align: center` auf `#root` in `src/index.css:71`) und hat dadurch nirgends visuelle Hierarchie.
2. Die schwebende Bottom-Nav verdeckt echte interaktive Elemente am Seitenende (Logout-Button auf `/profile`, „Fortschrittsfotos"-Link auf `/body`).
3. Leerzustände sind Sackgassen ohne Call-to-Action.

Diese drei Punkte hängen zusammen (Punkt 1 verursacht die konkreten Hierarchie-Symptome, die der Critique unter Punkt 1 aufzählt) und werden in einem Vorhaben behandelt.

## Ausgangslage

- `#root { text-align: center }` wird von praktisch jedem unstyled Text-Element geerbt (`p`, `h1`, `h2`, `label`, lose `span`s). Buttons (`buttonPrimaryClass`/`buttonSecondaryClass`, beide `w-full` mit eigenem `inline-flex items-center justify-center`-Innenleben) und Link-Zeilen (`main a:not(li a):not(p a) { display:flex }` plus explizites `justify-center` an den Aufrufstellen) sind **nicht** betroffen — die zentrieren sich unabhängig vom geerbten `text-align` selbst.
- Betroffen sind vor allem: Fließtext/Überschriften, Formularlabels (`ProfilePage`), Kennzahlen-Karten ohne eigene Ausrichtung (`BodyPage`), und Komponenten, die Zahlen als Satz statt als Stat rendern (`DailySummary` auf `/nutrition`).
- `BottomNav` ist eine schwebende Pille (`sticky bottom-4 mx-4 rounded-full`, kein volles Bottom-Bar mit Top-Border) direkt nach `<main>` im Flex-Column-Layout von `AppLayout`. `main` hat aktuell nur `padding: 0 16px 16px` — keine Reserve für die Pille, dadurch überdeckt sie das letzte sichtbare Element in kurzen `main`-Inhalten.
- Leerzustands-Copy sitzt an drei Stellen: `TrainingPage.tsx` (`Kein aktiver Plan.`, reiner Text ohne verknüpfte Aktion — die vorhandenen `Link`s darunter sind generische Bereichsnavigation, keine dem Leerzustand zugeordnete CTA), `ChartFrame.tsx` (`Noch nicht genug Daten für diesen Graphen.`, eine einzige Stelle für alle Analyse-Graphen app-weit), `BodyPage.tsx` (sieben „—"-Platzhalter in den Kennzahlen-Karten).

## Entscheidung 1: Linksbündig als Standard, `#root` verliert `text-align`

`#root`s `text-align: center` entfällt ersatzlos (Browser-Default: `start`, in der Praxis linksbündig für die deutsche UI). Kein Ersatz-Property auf `#root` — Ausrichtung wird ab jetzt dort gesetzt, wo sie eine bewusste Entscheidung ist, nicht global vererbt.

**Bewusste Ausnahmen, die zentriert bleiben:**
- `LoginPage` (eigener, bereits im P0/2-Task fertiggestellter Screen mit zentriertem Logo/Formular) — bekommt seine Zentrierung jetzt explizit auf dem eigenen Wrapper, statt sie implizit von `#root` zu erben.
- Lade-/Fehlerzustände, die aktuell `<p>Lädt…</p>` als einzigen Seiteninhalt zeigen, bleiben inhaltlich unverändert (kurzer Text, Zentrierung dort ist kein Hierarchie-Problem) — kein aktiver Umbau, nur kein Verlass mehr auf die geerbte Regel: wo eine sichtbare Verschiebung entstünde, wird das explizit nachgezogen.
- Einzelne große Kennwerte, wo Zentrierung eine bewusste Stat-Darstellung ist (z. B. der Prozentwert im Fortschrittsring, falls vorhanden) — Einzelfallentscheidung beim jeweiligen Seiten-Task, nicht pauschal.

**Sweep-Prinzip für die Implementierung:** Jede Seite bekommt nach dem Wegfall der globalen Regel eine Sichtprüfung (echter Chrome, Desktop + Mobile-Breite) und wird auf linksbündige Textausrichtung mit klarer Label/Wert-Hierarchie gebracht — Label kleiner/gedämpfter (`text-text-muted`), Wert größer/betont, mit sichtbarem Abstand dazwischen statt direkt aneinandergereiht. Konkret bereits identifiziert:

- **`BodyPage.tsx`** Kennzahlen-Karten: `<span>{FIELD_LABELS[field]}</span>` und der Wert-`<span>` bekommen eine vertikale Anordnung (`flex flex-col items-start`) statt der aktuellen impliziten Reihung ohne Abstand.
- **`DailySummary.tsx`** (`/nutrition`): der Kalorienstand wird von einem Fließtext-Satz zu einer echten Stat-Zeile umgebaut — verbrauchte kcal als große Zahl, „von {goal} kcal" / „{remaining} kcal offen" als kleinere Sekundärzeile darunter, keine Ganzsatz-Konstruktion mehr. Die Makro-Zeile (Eiweiß/Fett/Kohlenhydrate) bleibt als kompakte Zeile bestehen, nur linksbündig statt zentriert.
- **`ProfilePage.tsx`** Formularfelder: `label { display:block }` reicht nach Wegfall der Zentrierung für eine einheitliche Linksbündigkeit aus (jedes Label ist eigene Block-Zeile) — hier ist keine strukturelle Änderung nötig, nur die Sichtprüfung, dass nichts mehr uneinheitlich eingerückt wirkt.

Alle weiteren Seiten (`HomePage`, `TrainingPage` + Unterseiten, `NutritionEntriesPage`, `BodyEntriesPage`, `BodyPhotosPage`, die vier `*AnalysisPage`s, `TrainingPlansPage`, `TrainingPlanEditPage`, `WorkoutSessionPage`, `ExercisesPage`, `TrainingHistoryPage`/`-DetailPage`, `ProfilePage`s Nicht-Formular-Teile) durchlaufen dieselbe Sichtprüfung; strukturelle Änderungen nur, wo der Wegfall der Zentrierung tatsächlich etwas sichtbar verschlechtert oder gegen die Label/Wert-Hierarchie oben verstößt. Kein pauschaler Umbau aller 18 Seiten ohne konkreten Befund — das wäre Risiko ohne Nutzen.

## Entscheidung 2: `main` reserviert Platz für die schwebende Nav

Die bestehende `main`-Regel (`index.css`, `@layer base`) wird von der `padding: 0 16px 16px`-Kurzschreibweise auf explizite Longhands umgestellt, damit `padding-bottom` unabhängig gesetzt werden kann:

```css
main {
  flex: 1;
  padding-inline: 16px;
  padding-block-end: calc(4rem + env(safe-area-inset-bottom) + 16px);
}
```

`4rem` deckt die Pillenhöhe (zwei `p-2` also 16px plus 44px hohe Icon-Targets plus etwas Toleranz) plus deren eigenen `bottom-4`-Sticky-Abstand ab; `env(safe-area-inset-bottom)` verdoppelt sich nicht mit `BottomNav`s eigenem `max(0.5rem, env(...))`-Padding, weil das eine die Pille selbst betrifft und das andere den Raum davor — beide addieren sich korrekt zum tatsächlich benötigten Frei­raum. Exakter Wert wird im Implementierungs-Task per echtem `getBoundingClientRect` auf Logout-Button/„Fortschrittsfotos"-Link gegen die Nav-Pille verifiziert (0px Überlappung), nicht nur aus der Formel übernommen.

## Entscheidung 3: Leerzustände bekommen einen Call-to-Action

- **`TrainingPage.tsx`:** `{plan == null && <p>Kein aktiver Plan.</p>}` wird zu einem Link im `buttonPrimaryClass`- oder `buttonSecondaryClass`-Look („Trainingsplan anlegen" → `/training/plans`, dort existiert bereits das Anlage-Formular). Der bisherige generische „Meine Pläne"-Link bleibt zusätzlich bestehen (Navigation bleibt Navigation, CTA ist die neue, gezielte Aktion für exakt diesen Leerzustand).
- **`ChartFrame.tsx`:** neue optionale Prop `leerCta?: { label: string; to: string }`. Wird sie gesetzt, erscheint sie als Link unter dem „Noch nicht genug Daten…"-Text; jedes Dashboard setzt sie einmal für alle seine Charts (nicht pro Chart-Typ einzeln) auf die zentrale Eintragsaktion des Bereichs:
  - Training-Dashboard/-Analyse: `{ label: 'Training starten', to: '/training' }`
  - Ernährungs-Dashboard/-Analyse: `{ label: 'Eintragen', to: '/nutrition' }`
  - Körper-Dashboard/-Analyse: `{ label: 'Heute eintragen', to: '/body' }`
  - Home-Dashboard/-Analyse: kein CTA (Home ist rein lesend und verlinkt bereits in die Bereiche, siehe `docs/superpowers/specs/2026-09-06-home-dashboard-design.md`) — `leerCta` bleibt hier `undefined`.
- **`BodyPage.tsx`** „—"-Platzhalter: unverändert (siehe Brainstorming-Abstimmung mit dem Nutzer, 10.09.2026) — der vorhandene „Heute eintragen"-Button ist der CTA dafür, kein zusätzlicher Text pro Karte.

## Betroffene Dateien (Kern, nicht abschließend für den Seiten-Sweep)

- `src/index.css`: `#root`-Regel, neues `main`-Padding.
- `src/pages/LoginPage.tsx`: explizite Zentrierung auf eigenem Wrapper nachziehen.
- `src/pages/BodyPage.tsx`, `src/components/DailySummary.tsx`, `src/pages/ProfilePage.tsx`: siehe Entscheidung 1.
- `src/pages/TrainingPage.tsx`: siehe Entscheidung 3.
- `src/components/charts/ChartFrame.tsx` + alle Aufrufstellen (`TrainingChartList`/`NutritionChartList`/`BodyChartList` bzw. deren Dashboard-Elternkomponenten, die `leerCta` durchreichen).
- Jede weitere Seite aus der Liste in Entscheidung 1, im Umfang der jeweiligen Sichtprüfung.

## Tests

- Bestehende Tests prüfen Textinhalt/Rollen, nicht Ausrichtung — durch den Alignment-Wechsel wird keine Testanpassung erwartet, mit Ausnahme von `DailySummary.test.tsx` (neue Stat-Struktur, falls sich der DOM-Aufbau ändert) und `ChartFrame.test.tsx`/den Dashboard-Tests (neuer `leerCta`-Link im Leerzustand).
- Volle Testsuite (`npm test`) plus Lint/`tsc -b --noEmit`/`npm run build` wie bei jedem bisherigen Task.
- Manuelle Browser-Verifikation (echter Chrome, Desktop + Mobile-Breite) je Bereich: visuelle Hierarchie, `getBoundingClientRect` auf Logout-Button (`/profile`) und „Fortschrittsfotos"-Link (`/body`) gegen die Bottom-Nav-Pille (0px Überlappung), CTA-Links in allen drei benannten Leerzuständen klickbar und korrekt verlinkt.

## Bewusst außen vor

- P2-Befunde (WCAG-Kontrast beim Akzent-Lila, unübersetzte Muskelgruppen-Werte) — eigener, nachfolgender Task laut Nutzer-Entscheidung zur strikten P0→P1→P2-Reihenfolge.
- Feature-Wünsche (Geräte-Filter, Bilder+Detailseite+Übersetzung) — eigene, bereits vorbereitete Vorhaben nach P2.
- Kein pauschaler Neuaufbau aller Seiten mit neuen Komponenten — Refinement, nicht Redesign: bestehende Struktur, Copy und Funktion bleiben, nur Ausrichtung/Hierarchie/Nav-Abstand/CTA ändern sich.
- Der geparkte Codex-Fund am `measurement`-Icon (Pfad ragt am linken Rand über den Viewport) bleibt wie in `CLAUDE.md` vermerkt zurückgestellt — gehört zur Icon-Geometrie, nicht zu diesem Layout-Vorhaben.

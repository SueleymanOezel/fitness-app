# Block 2 – „Spürbar hochwertiger“: Hero je Tab, kompakte Listen, Skeletons, Leerzustände

Stand: 18.10.2026 · Herkunft: Mobile-Audit vom 13.10.2026 (`.impeccable/critique/2026-10-13T20-53-41Z__vitaloop-web-app.md`, 16/40 Design) · Block 2 von 4 (Block 1 Designsystem ist live, Block 3 ehrliche Daten und Block 4 Performance/PWA/Security folgen).

## Ziel

Die vier Tab-Startseiten (Home, Training, Ernährung, Körper) fühlen sich nach einer Marke an statt nach gestapelten Textlinks und gleich aussehenden Karten. Nach dem Öffnen ist sofort klar, was heute ansteht, und die tägliche Hauptaktion ist genau einen Tap entfernt (Produktprinzip „Erfassen in Sekunden“). Laden und leere Zustände wirken gestaltet statt unfertig.

## Entscheidungen aus dem Brainstorming

1. **Hero-Rolle:** heutiger Status plus genau eine Hauptaktion (nicht nur ein visueller Kopf, kein Mini-Graph im Hero).
2. **Aufbau je Tab (Variante B):** Mini-Leiste oben (auf Training der Wochenstreifen, sonst Kennzahlen), darunter der Hero, darunter eine Listenkarte mit den Bereichs-Links.
3. **Ernährung, Hauptaktion:** „Eintrag hinzufügen“ öffnet einen Dialog auf dem Dashboard, in dem der Mahlzeiten-Abschnitt gewählt wird (nach Tageszeit vorbelegt). Kein Seitenwechsel.
4. **Aufbau:** geteilte Bausteine plus neue Rezepte in `ui-classes.ts`, die Seiten setzen sie zusammen. Keine pro-Seite-Heroes, kein generisches `DashboardLayout` mit Slots.
5. **Grenze:** Übungskatalog und Session-Screen bleiben unangetastet (Katalog wird in Block 4 virtualisiert, Session-Logik gehört zu Block 3).

## Nicht-Ziele

Datenlogik-Fixes (leerer Satz, Satzkorrektur, Lösch-Bestätigung, Körper-Datum-Duplikat, 404, deutsche Fehler, englische Übungsnamen) → Block 3. Virtualisierung, Cache-Header, Manifest/Service Worker, RLS-Performance → Block 4. Keine Sparkline im Körper-Hero. Keine neue Animationsbibliothek, kein zusätzlicher GSAP-Einsatz.

## Bausteine (`src/components/`, Rezepte in `src/lib/ui-classes.ts`)

Regeln aus Block 1 gelten weiter: Aussehen nur über Rezepte, Fläche Seite `bg` / Karte `surface` / Bedienelement `surface-raised`, keine Karte in Karte, kein `m-0`/`gap-*` neben `cardClass`, Buttons ausschließlich über `Pressable`.

| Baustein | Aufgabe |
|---|---|
| `PageHero` | Eine Karte: kleines Label, großer Wert oder Titel (`statClass`), optionale Unterzeile, genau eine Hauptaktion (`Pressable variant="primary"` oder `PressableLink`). Optionaler Slot links für den Ring. |
| `StatStrip` | Reihe aus zwei bis drei Kacheln (Label `labelClass`, Zahl `statClass`), optional mit dünnem Balken. Auf Training stattdessen `WeekStrip`. |
| `WeekStrip` | Sieben Tage Mo–So der aktuellen Woche: trainiert (Akzent), heute (Ring in Türkis), offen (neutral). Reine Anzeige. |
| `ProgressRing` | SVG-Ring mit `role="img"` und `aria-label` („640 kcal übrig“), Anteil 0–1, Füllung beim Mount per CSS (`stroke-dashoffset`, unter `motion-reduce` ohne Übergang). Anteil wird auf 0–1 begrenzt. |
| `LinkListCard` | Eine Karte mit `listClass`-Zeilen: Icon, Beschriftung, optional Wert rechts, Pfeil. Jede Zeile ein `PressableLink` mit 44 px Mindesthöhe. Ersetzt die gestapelten Textlinks auf allen Dashboards und den Unterseiten. |
| `Skeleton` | Pulsierender Block (`animate-pulse`, unter `motion-reduce` statisch). |
| `PageSkeleton` | Überschrift plus Hero- und Listenform aus `Skeleton`. Trägt `role="status"` und einen `sr-only`-Text „Lädt…“, damit Zugänglichkeit und die vielen vorhandenen Tests auf „Lädt…“ erhalten bleiben. |
| `EmptyState` | Titel, ein Satz, eine Aktion (`PressableLink` oder `Pressable`). Ersetzt tote Sätze wie „Kein aktiver Plan.“. |

## Seiten

### Training (`TrainingPage`)
- Hinweiszeile „Plan läuft seit N Wochen“ bleibt über dem Hero.
- `WeekStrip` oben. Datenquelle: `useTrainingStreak` liefert zusätzlich zur Zahl die Liste der Trainingstage (`tage: string[]`, lokale Kalendertage aus den schon geladenen beendeten Sessions, keine neue Abfrage). Eine reine Funktion `wochenStreifen(tage, heute)` bildet Mo–So.
- Hero: „Heute · {Plan}“, Tagesname groß, „Training starten“ (Doppelklick-Schutz wie bisher über `starting`).
- Kein aktiver Plan: `EmptyState` mit „Trainingsplan anlegen“. Plan ohne Tage: `EmptyState` mit Link zum Plan-Editor.
- Pläne, Übungen, Historie, Analyse in einer `LinkListCard`, darunter die angehakten Charts.

### Ernährung (`NutritionPage`)
- Hero: `ProgressRing` plus „{n} kcal übrig“ und „von {Ziel}“. Ohne Ziel: „{n} kcal gegessen“ und Link ins Profil. Ersetzt die Formulierung „kcal verbraucht“ in `DailySummary` für Gegessenes.
- Hauptaktion „Eintrag hinzufügen“ öffnet `Dialog` mit Abschnitts-Chips und `AddEntryFlow`. Vorbelegung über reine Funktion `abschnittFuerUhrzeit(sections, now)` (nächster sichtbarer Abschnitt nach Tageszeit, Fallback erster sichtbarer). Nach dem Speichern lädt `useFoodEntries` neu, der Dialog schließt. Fehler bleiben im Dialog inline (Dialog-Regel aus Phase 6: kein Toast hinter offenem Dialog).
- `StatStrip` mit Eiweiß, Kohlenhydrate, Fett (Zahl plus dünner Balken in den Farben aus `chart-colors.ts`).
- Mahlzeiten-Abschnitte als `LinkListCard` (Name, kcal rechts, `aria-label` unverändert „Name — kcal“). Ist `visibleSections` leer, entfällt die Karte komplett.
- Links „Ziel im Profil“, „Einträge ansehen“, „Analyse“ als `LinkListCard`.

### Körper (`BodyPage`)
- Hero: aktuelles Gewicht groß, Änderung seit dem letzten Eintrag, „Heute eintragen“ (weiter `stickyActionClass` und derselbe Dialog mit Vorbelegung des heutigen Eintrags).
- Übrige Werte (fünf Umfänge, Körperfettanteil) als eine Listenkarte (Label, Wert, Änderung) statt sechs Einzelkarten im Raster. Fehlende Werte zeigen „—“ wie bisher.
- Verlauf, Fotos, Analyse als `LinkListCard`.

### Home (`HomePage`)
- `StatStrip` mit Streak und Gewicht (nur wenn vorhanden).
- Hero „Heute · Training“ (Plan und Tag; die Hauptaktion heißt „Zum Training“ und führt zu `/training`, dort startet der Nutzer; kein Start direkt aus Home, damit es nur einen Startpfad gibt).
- Kalorien-Karte mit `ProgressRing` (gleiche Logik wie Ernährung, über einen gemeinsamen Hilfswert).
- `LinkListCard` mit Ernährung, Training, Körper, Analyse. Die drei bisherigen Karten mit je einem Textlink entfallen.
- Fehler je Bereich bleiben `role="alert"` und sperren die anderen Bereiche nicht.

### Kompakte Listen
Karte-pro-Zeile wird zu einer Karte mit `divide-y`-Zeilen (`listClass`/`listRowClass`) in: `TrainingHistoryPage`, `TrainingPlansPage`, `BodyEntriesPage`, `FoodEntryList` (Einträge). Die Struktur wird je Seite per Strukturtest gesperrt (wie in Plan 2b/2c). `ExercisesPage`, `ExercisePicker` und `WorkoutSessionPage` bleiben unverändert, außer dem verschobenen Block-1-Punkt (Picker `gap` statt `space-y`).

### Laden und Fehler
- `PageSkeleton` ersetzt „Lädt…“ auf den vier Dashboards und den Listenseiten aus dem Abschnitt „Kompakte Listen“. Weitere Seiten behalten ihr „Lädt…“ (Profil, Plan-Editor, Wizard, Session) und werden nur angefasst, wenn sie ohnehin berührt werden.
- Chart-Listen (`HomeChartList` u. a.): „Lädt…“ wird ein Skeleton in Kartengröße. Das „Noch nicht genug Daten“-Muster bleibt, die Wiederholung pro Chart wird nicht ausgebaut (Audit-Hinweis „Wand aus Leerzustands-Karten“ wird nur durch `EmptyState` bei komplett leerem Bereich entschärft, nicht durch Umbau der Chart-Logik).

### Verschobene Block-1-Punkte
Abstand zwischen Chart-Karten von `space-y-4` auf 24 px (`space-y-6`), 36 px Luft in der Mahlzeiten-Karte entfällt mit dem Umbau auf `LinkListCard`, leere Mahlzeiten-Karte bei `[]` entfällt (siehe Ernährung), Link-Gruppen stehen auf allen Dashboards einheitlich nach dem Hero und vor den Charts, `ExercisePicker` `space-y-1` / `LoggedSets` `space-y-2` auf `gap`-Layout im Elternelement.

## Motion und Zugänglichkeit

- Skeleton-Puls und Ring-Füllung nur CSS; unter `prefers-reduced-motion` statisch.
- Kein neuer GSAP-Einsatz; Tap-Feedback kommt weiter aus `Pressable`. Der Entry-Chunk darf nicht wachsen, `grep -c gsap dist/assets/index-*.js` bleibt 0.
- Alle Tap-Ziele mindestens 44 px, Kontraste über die vorhandenen Tokens, Ring und Wochenstreifen haben Textalternativen.
- Hero und Hauptaktion dürfen bei 390 px nicht unter der Nav liegen (`--nav-clearance` greift über `main`).

## Tests

- Reine Funktionen mit Unit-Tests: `wochenStreifen`, `abschnittFuerUhrzeit`, Ring-Anteil (Begrenzung 0–1, Ziel 0 / fehlendes Ziel).
- Je Baustein ein Rendertest (Rollen, Textalternativen, Reduced-Motion-Klassen).
- Seitentests: Hero-Inhalt, Leerzustände, Skeleton, Dialog-Flow auf Ernährung (Abschnitt vorbelegt, Speichern, Fehler inline).
- Strukturtests gegen Rückfall in Karte-pro-Zeile.
- `useTrainingStreak`-Test um `tage` erweitert; bestehende Konsumenten (Home, Abschluss-Screen) bleiben kompatibel.
- Vor Merge: `npx vitest run`, `npm run lint`, `npx tsc -b --noEmit`, `npm run build` (kein GSAP im Entry), Sicht-Prüfung bei 390 px im Chrome des Nutzers (Klicks per `javascript_tool`), Review plus Scoped Re-Review, `codex review` als Zweitmeinung.

## Risiken

- Der Ernährungs-Dialog führt `AddEntryFlow` an einer zweiten Stelle ein. Der Dialog hält seine Kinder gemountet (siehe `Dialog`), deshalb wird der Inhalt nur bei `open` gerendert, damit er beim Öffnen frisch vorbelegt ist.
- Tests, die auf „Lädt…“ oder auf bisherige Linktexte prüfen, brauchen Anpassungen; `PageSkeleton` mit `sr-only`-Text hält das klein.
- Kein Datenbank-Schema betroffen; `docs/domaenenmodell.md` bleibt unverändert.

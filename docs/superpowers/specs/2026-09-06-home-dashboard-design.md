# Home-Dashboard – Design

**Spec-Datum:** 06.09.2026

## Ziel

`HomePage.tsx` ist seit Projektbeginn ein reiner Platzhalter — bewusst aus Phase 5 (Analysebereich) und Phase 6 (Design) ausgeklammert, weil das Datenmodell für einen Trainingstag/Restday-Kalender fehlte. Dieses Vorhaben holt Home in einem Schritt auf den Stand der drei anderen Bereiche nach: eigene Analyse-Graphen (Registry-Eintrag `Bereich = 'home'`, Opt-in über `ChartPicker`, eigene `/home/analyse`-Unterseite) **und** die Phase-6-Design-Bausteine (`cardClass`, `Chip`, `ChartFrame`) — nicht nacheinander wie bei Training/Ernährung/Körper ursprünglich, sondern in einem Rutsch, damit Home nicht als einziger Bereich in einem Zwischenzustand verharrt.

## Ausgangslage

- `src/pages/HomePage.tsx` rendert nur `<h1>Home</h1>` und einen Platzhaltertext.
- Die Tabellen `day_status` (`datum`, `status` check `'trainingstag'|'restday'`) und `health_sync_data` existieren seit Migration `0001_initial_schema.sql`, werden aber von keiner Code-Stelle gelesen oder beschrieben.
- `profiles.analyse_auswahl` (Migration `0007`) ist bereits ein generisches `jsonb`-Array von Chart-IDs, validiert gegen `CHART_IDS` aus der Registry (`src/lib/analysis/auswahl.ts`, `parseAuswahl`/`toggleAuswahl`). Neue IDs funktionieren ohne Schema-Änderung.
- Die drei bestehenden Bereiche folgen demselben Muster: ein Dashboard mit festem Wichtigstem-Inhalt plus optional angehakten Graphen (`ChartPicker`), eine `/<bereich>/analyse`-Unterseite mit allen Graphen des Bereichs und einem `ZeitraumSwitch`, ein `use<Bereich>Analysis`-Hook, eine `<Bereich>ChartList`-Komponente mit einem `switch` über Registry-IDs, jeder Chart einzeln hinter `React.lazy`.

## Entscheidung: `day_status` bleibt ungenutzt, Status wird live abgeleitet

Kein Schreibpfad zur `day_status`-Tabelle. Ein Trainingstag ist ein Kalendertag mit mindestens einer abgeschlossenen Trainingseinheit (`workout_sessions.beendet_am` gesetzt), alles andere ein Restday — abgeleitet aus denselben Daten, die `useTrainingAnalysis` bereits liefert, genau wie K3 (Änderungsrate) schon heute aus K1s Trendlinie abgeleitet wird statt eine eigene Tabelle zu pflegen. `day_status`/`health_sync_data` bleiben als Tabellen bestehen (kein Migrations-Rollback, keine Downtime-Notwendigkeit), sind aber weiterhin architektonisch tot — vorgemerkt für die spätere Apple-Shortcuts-Integration (Phase 4-Nachtrag, `health_sync_data`), nicht Teil dieses Vorhabens.

## Registry-Erweiterung

`src/lib/analysis/registry.ts`:

```ts
export type Bereich = 'training' | 'nutrition' | 'body' | 'home'

export const H1 = 'H1'
export const H2 = 'H2'
export const H3 = 'H3'

// chart-titles.ts ergänzt:
export const AKTIVITAETSRASTER_TITEL = 'Aktivitätsraster'
export const WOCHEN_KURZFORM_TITEL = 'Wochen-Kurzform'
export const TRENDS_TITEL = 'Trends'

// CHARTS-Array ergänzt:
{ id: H1, bereich: 'home', titel: AKTIVITAETSRASTER_TITEL },
{ id: H2, bereich: 'home', titel: WOCHEN_KURZFORM_TITEL },
{ id: H3, bereich: 'home', titel: TRENDS_TITEL },
```

Kein neuer Default in `profiles.analyse_auswahl` (bleibt `["T1","E1","K1"]`) — bestehende und neue Profile bekommen H1–H3 nicht automatisch angeheftet, Nutzer hakt sie wie jeden anderen Graphen selbst an.

## Die drei Home-Graphen

### H1 — Aktivitätsraster

Ein Feld je Kalendertag über den gewählten Zeitraum (30/90/365/alles, dieselbe `ZeitraumSwitch`-Auswahl wie jeder andere Graph auf der Analyse-Seite — kein Sonderfenster). Trainingstag vs. Restday, farblich unterschieden über Design-Tokens (`bg-accent` für Trainingstag, `bg-surface` mit Rahmen für Restday) — **kein Recharts**, ein reines CSS-Grid (`grid grid-cols-7 gap-1`, eine Spalte je Wochentag, Zeilen = Wochen), analog dazu, dass T8/K5 schon heute ohne Recharts als Liste auskommen.

Neue Funktion `src/lib/analysis/home-charts.ts`:

```ts
export type RasterTag = { datum: string; status: 'trainingstag' | 'restday' }

/**
 * Ein Eintrag je Kalendertag von `start` bis heute, aeltester zuerst.
 * Trainingstag: mindestens eine Session mit `beendet_am` an diesem Tag.
 */
export function aktivitaetsraster(
  sessions: { beendet_am: string | null }[],
  start: string | null,
  heute: string,
): RasterTag[]
```

`start === null` (Zeitraum "alles") beginnt am ersten Tag mit Daten, nicht am Beginn der Unix-Epoche — sonst rendert das Grid tausende leere Restday-Felder vor dem ersten echten Eintrag. Ohne jede Session ist das Ergebnis ein leeres Array, `ChartFrame`s `leer`-Zustand greift.

### H2 — Wochen-Kurzform

Eine Zeile je Kalenderwoche im Zeitraum (`wochenStart`/`wochenLabel` aus `src/lib/analysis/wochen.ts`, bereits von T1/E5 geteilt): Anzahl abgeschlossener Trainingseinheiten, durchschnittliche Tageskalorien (nur über Tage **mit** Eintrag, wie E5 es für den Wochenschnitt schon vormacht), Gewichtsänderung (letzter minus erster gemessener Wert der Woche, auf zwei Nachkommastellen gerundet wie in `changeSince`, `null` wenn unter zwei Messungen). Ebenfalls eine reine Liste, kein Recharts.

```ts
export type WochenZeile = {
  woche: string
  trainingseinheiten: number
  kalorienschnitt: number | null
  gewichtsAenderung: number | null
}

export function wochenKurzform(
  sessions: { beendet_am: string | null }[],
  tagesKalorien: { tag: string; kalorien: number }[], // aus kalorienJeTag (nutrition-charts.ts)
  gewichte: { datum: string; gewicht: number | null }[],
): WochenZeile[]
```

### H3 — Trends (zwei Sparklines)

Gewichtstrend (`gewichtsTrend` aus `src/lib/analysis/body-charts.ts`, dieselbe EWMA-Trendlinie wie K1) und Kalorien pro Tag (`kalorienJeTag` aus `nutrition-charts.ts`, dieselbe Funktion wie E1) nebeneinander als zwei kleine `LineChart`s ohne Achsen, Gitter oder Tooltip — rein visuell "auf einen Blick". Einziger der drei Home-Graphen mit Recharts, damit auch der einzige mit Farbzuordnung: Gewicht `CHART_BLUE`, Kalorien `CHART_MINT` (dieselbe Zuordnung wie K1: Trend/Hauptmetrik zuerst genannt, hier zwei gleichrangige Metriken nebeneinander statt einer Haupt-/Vergleichslinie — deshalb beide in denselben zwei Farben wie die bestehenden Einzelgraphen, nicht neu erfunden).

## Datenfluss

Neuer Hook `src/hooks/use-home-analysis.ts` — komponiert die drei bestehenden Bereichs-Hooks statt eigene Supabase-Abfragen zu schreiben (DRY: Pagination, Chunking und Fehlerbehandlung existieren bereits je Bereich):

```ts
export function useHomeAnalysis(userId: string, zeitraum: Zeitraum) {
  const training = useTrainingAnalysis(userId, zeitraum)
  const nutrition = useNutritionAnalysis(userId, zeitraum)
  const body = useBodyAnalysis(userId, zeitraum)
  return {
    sessions: training.sessions,
    entries: nutrition.entries,
    rows: body.rows,
    loading: training.loading || nutrition.loading || body.loading,
    error: training.error || nutrition.error || body.error,
  }
}
```

**Bewusste Konsequenz:** sobald mindestens ein Home-Graph angehakt ist, feuert das Dashboard/die Analyse-Seite alle Abfragen, die Training (2), Ernährung (2) und Körper (3) einzeln schon auslösen — zusammen bis zu 7 Abfragen statt eigener, schlankerer Home-spezifischer Queries. Bewusst in Kauf genommen (wie schon bei Body: "3 Abfragen unabhängig davon, welcher K-Graph angehakt ist") — eigene Abfragen wären eine zweite Kopie derselben Pagination/Chunking-Logik. Die "kein Häkchen → keine Abfrage"-Invariante bleibt gewahrt: ohne angehakten Home-Graphen mountet `useHomeAnalysis` gar nicht (identisches Muster zu `DashboardTrainingChartsData` in `TrainingPage.tsx`).

`HomeChartList.tsx` (neu, `src/components/charts/`): derselbe `switch`-über-Registry-IDs wie `TrainingChartList`/`NutritionChartList`/`BodyChartList`, jeder der drei Charts einzeln hinter `React.lazy`.

## Feste Dashboard-Übersicht (nicht Opt-in, immer sichtbar)

Kein neuer Code für die Werte selbst — reine Komposition bestehender, bereits pro Bereich genutzter Hooks, in eine Karte gefasst (`cardClass`):

- **Kalorien heute:** `useProfile` + `useFoodEntries`, `effectiveCalorieGoal(profile)` gegen die Tagessumme (`sumKalorien`) — identische Rechnung wie auf `NutritionPage`.
- **Nächster Trainingstag:** `useActiveTrainingDay` — Plan- und Tagname wie auf `TrainingPage`, "Kein aktiver Plan" als Leerzustand.
- **Letzte Gewichtsänderung:** `useBodyMetrics` + `changeSince(rows, 'gewicht')` aus `src/lib/body-change.ts` — identisch zu `BodyPage`.

Jeder der drei Werte verlinkt in seinen Bereich (`/nutrition`, `/training`, `/body`). Kein Formular, kein Dialog, kein Toast — Home ist rein lesend, alle Aktionen passieren in den verlinkten Bereichen.

## Seiten und Routing

- `src/pages/HomePage.tsx`: Neuschreiben. Status-Karte (siehe oben) + `ChartPicker`-gesteuerte H1–H3-Graphen, mit den Phase-6-Bausteinen gebaut (`cardClass`-Karten, keine bloße `<ul>`).
- `src/pages/HomeAnalysisPage.tsx` (neu): `ZeitraumSwitch` + alle drei Home-Graphen, analog zu `TrainingAnalysisPage`/`NutritionAnalysisPage`/`BodyAnalysisPage`.
- `src/App.tsx`: `HomeAnalysisPage` lazy importiert (wie die drei bestehenden Analyse-Seiten), neue Route `/home/analyse`.

## Fehlerbehandlung und Leerzustände

- Neuer Account ohne jede Historie: H1 zeigt einen reinen Restday-Raster (kein "leer", es gibt ja Tage, nur alle Restday) — bewusst anders als H2/H3, die bei keinerlei Daten (`sessions.length === 0 && entries.length === 0 && rows.length === 0`) den `leer`-Zustand von `ChartFrame` zeigen.
- Ladefehler (`error` von `useHomeAnalysis`) rendern `<p role="alert">Daten konnten nicht geladen werden.</p>`, identisch zu den drei bestehenden Analyse-Seiten.
- Die feste Status-Karte zeigt "—" bzw. "Kein aktiver Plan"/"Keine Messwerte" statt eines Werts, wenn die jeweilige Quelle leer ist — exakt das bestehende Muster aus `BodyPage`/`TrainingPage`.

## Tests

- `home-charts.test.ts`: `aktivitaetsraster` und `wochenKurzform` als reine Funktionstests (Eingabe/Ausgabe), keine Recharts-Beteiligung.
- `ActivityGridChart.test.tsx`/`WeeklySummaryList.test.tsx`: DOM-Assertions auf gerenderte Zellen/Zeilen und deren Text/Status-Klasse — kein Recharts-Marken-Problem, da beide reine CSS-/Listen-Komponenten sind.
- `HomeSparklines.test.tsx`: folgt der Projekt-Konvention, prüft gezeichnete Linienpunkte (`M`/`L`-Befehle bzw. Punktanzahl), nie Farbwerte.
- `HomePage.test.tsx`/`HomeAnalysisPage.test.tsx`: analog zu den bestehenden Bereichsseiten-Tests — Leerzustände, Fehlerzustand, "kein Häkchen → keine Abfrage"-Invariante.

## Bewusst außen vor

- Kein Schreibpfad zu `day_status`/`health_sync_data` (siehe oben).
- Keine Apple-Shortcuts-/Health-Integration — das ist ein eigenes, noch unspezifiziertes künftiges Vorhaben (`health_sync_data` bleibt dafür reserviert).
- Kein neuer Default in `profiles.analyse_auswahl` für H1–H3.
- Kein Kalender mit Monatsnavigation — das Aktivitätsraster ist ein Streak-artiges Raster, kein Termin-/Ereigniskalender.

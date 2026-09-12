# Motivations-Layer (PR-Tracking, Streak, Abschluss-Screen) — Design

**Spec-Datum:** 12.09.2026

## Ziel

Erstes der beiden von der Wettbewerbsanalyse-Priorisierung verbliebenen Vorhaben (siehe „Neue Richtung: Wettbewerbsanalyse" in `CLAUDE.md`, Punkt 5 „Motivations-Layer"). Nutzer-Entscheidung im Brainstorming: alle drei Teile — PR-Tracking, Streak-Zähler, Abschluss-Screen — werden als **ein** zusammenhängendes Vorhaben umgesetzt, der Abschluss-Screen als Container, der beide anzeigt.

## Ausgangslage

- `src/lib/analysis/training-charts.ts` hat bereits `epley1RM(gewicht, wiederholungen)` und `persoenlicheRekorde(sessions, sets)` (T8, die Rekorde-Liste der Trainingsanalyse) — beide arbeiten aber nur auf dem im jeweiligen Zeitraum geladenen Ausschnitt, nicht auf der vollen Historie, und sind nicht mit dem Live-Trainingsablauf verdrahtet.
- `src/hooks/use-workout-session.ts`s `completeSession(gewichtKg)` schreibt `beendet_am`/`gesamt_kalorien` und lädt neu; `src/pages/WorkoutSessionPage.tsx`s `complete()` ruft das auf und navigiert danach sofort zu `/training` — es gibt aktuell keinen Abschluss-Screen.
- `src/lib/analysis/home-charts.ts`s `aktivitaetsraster()` definiert bereits „Trainingstag" als: mindestens eine Session mit gesetztem `beendet_am` an diesem Kalendertag (`localDay(session.beendet_am)`) — dieselbe Definition soll der Streak übernehmen.
- `HomePage.tsx`s `Dashboard`-Komponente baut ihre drei Statuskarten (Kalorien/Training/Gewicht) aus eigenständigen, kleinen Hooks (`useFoodEntries`, `useActiveTrainingDay`, `useBodyMetrics`) zusammen — nicht über `useHomeAnalysis` (das ist laut eigenem Kommentar nur für die optionalen, angehakten Analyse-Graphen gedacht).
- RLS auf `workout_session_sets` prüft bereits über eine `exists`-Subquery gegen `workout_sessions.user_id = auth.uid()` (`0001_initial_schema.sql`) — eine Abfrage direkt auf `workout_session_sets`, gefiltert nur nach `exercise_id`, liefert dadurch automatisch nur Zeilen aus eigenen Sessions, ohne vorher Session-IDs sammeln zu müssen.
- Migrationen enden aktuell bei `0011`.

## Entscheidung 1: Kein neues Schema, keine neue Route

Streak und PR-Erkennung werden vollständig aus vorhandenen Spalten berechnet (`workout_sessions.beendet_am`, `workout_session_sets.gewicht`/`wiederholungen`/`ist_aufwaermsatz`) — keine Migration.

Der Abschluss-Screen ist **kein neuer Screen/keine neue Route**, sondern ein zweiter Render-Zustand innerhalb von `WorkoutSessionPage.tsx`s `LiveSession`-Komponente: nach erfolgreichem `completeSession()` wird nicht mehr sofort navigiert, sondern ein lokaler State (`abschluss: AbschlussDaten | null`) gesetzt, der die Live-Ansicht durch `SessionCompletionScreen` ersetzt. Navigation zu `/training` passiert erst, wenn der Nutzer auf „Fertig" tippt. Eine eigene Route wurde verworfen: ein späteres erneutes Aufrufen derselben URL (Zurück-Button, Lesezeichen) würde PRs gegen eine inzwischen weitergelaufene Trainingshistorie neu berechnen und damit falsche/verwirrende Werte zeigen — die bestehende Guard-Logik in `WorkoutSessionPage.tsx` (session bereits `beendet_am !== null` → Hinweis + Link zur Historie) bleibt für diesen Fall unverändert zuständig.

## Entscheidung 2: PR-Erkennung bei Abschluss, eine gezielte Zusatzabfrage

Neue Funktion in `training-charts.ts`, neben `epley1RM`/`persoenlicheRekorde`:

```ts
export type NeuerRekord = { exercise_id: string; name: string; neuesEinsRM: number; altesEinsRM: number | null }

export function neuePersoenlicheRekorde(
  sessionSets: { exercise_id: string; name: string; gewicht: number | null; wiederholungen: number | null; ist_aufwaermsatz: boolean }[],
  vorherigeBeste: Map<string, number>,
): NeuerRekord[]
```

Neue, eigenständige Hook-Funktion in `use-workout-session.ts`, getrennt von `completeSession()` (das bleibt unverändert nur für `beendet_am`/`gesamt_kalorien` zuständig):

```ts
async function ermittleNeueRekorde(): Promise<NeuerRekord[]>
```

`WorkoutSessionPage.tsx`s `complete()` ruft nach erfolgreichem `completeSession()` zusätzlich `ermittleNeueRekorde()` auf und legt das Ergebnis in den Abschluss-State. Ablauf innerhalb der Funktion:

1. Aus den bereits geladenen `sets` der Session: pro `exercise_id` das beste erreichte 1RM dieser Session (Arbeitssätze, `epley1RM`, wie T8).
2. Eine Abfrage `workout_session_sets.select('exercise_id, gewicht, wiederholungen').in('exercise_id', betroffeneIds).eq('ist_aufwaermsatz', false).neq('workout_session_id', sessionId)` — RLS liefert automatisch nur eigene Sessions. Daraus je Übung das bisher beste 1RM **ohne diese Session**.
3. `neuePersoenlicheRekorde` vergleicht: Session-Bestes > vorheriges Bestes (oder keine vorherige Historie vorhanden — dann zählt jeder Wert als PR, „erste Ausführung") ⇒ neuer PR.
4. Ein Fehler bei dieser Zusatzabfrage (`ermittleNeueRekorde` wirft) wird von `complete()` abgefangen und lässt die PR-Sektion einfach leer — kein blockierender Fehlerzustand für einen reinen Bonus-Inhalt, Dauer/Kalorien/Streak werden trotzdem angezeigt.

## Entscheidung 3: Streak als geteilter Hook, Home-Karte und Abschluss-Screen nutzen denselben

Neues Modul `src/lib/streak.ts`:

```ts
export function aktuellerStreak(sessions: { beendet_am: string | null }[], heute: string): number
```

Läuft rückwärts ab `heute`: ist heute noch kein Trainingstag, beginnt die Zählung bei gestern (ein noch nicht begonnener Tag bricht den Streak nicht sofort), dann fortlaufend rückwärts bis zur ersten Lücke. Nutzt dieselbe „Trainingstag"-Definition wie `aktivitaetsraster()` (Menge der `localDay(beendet_am)`-Werte), aber reine Zähllogik statt eines vollen Rasters — kein Abhängigkeit von `home-charts.ts` nötig.

Neuer Hook `src/hooks/use-training-streak.ts`:

```ts
export function useTrainingStreak(userId: string): { streak: number; loading: boolean }
```

Lädt seitenweise (wie die bestehenden Analyse-Hooks, `seitenweiseLaden`) ausschließlich `beendet_am` aus `workout_sessions` wo `user_id = userId` und `beendet_am is not null`, **ohne Zeitraum-Filter** — ein Streak kann älter sein als jedes Dashboard-Fenster (90 Tage). Wird an zwei Stellen verwendet: als vierte Statuskarte auf `HomePage.tsx` (`Dashboard`-Komponente, gleiches Muster wie `useBodyMetrics`) und im Abschluss-Screen — beide rufen denselben Hook auf, keine doppelte Logik oder zwei verschiedene Streak-Werte.

## Entscheidung 4: Inhalt des Abschluss-Screens

Neue Komponente `SessionCompletionScreen` (lokal in `WorkoutSessionPage.tsx`, wie `PauseTimer`/`SetForm`/`LoggedSets` es bereits sind):

- Überschrift „Training abgeschlossen", darunter Dauer und Kalorien (`gesamt_kalorien`, bereits von `completeSession()` berechnet — keine neue Rechnung).
- **Neue Rekorde**, nur gerendert wenn die Liste nicht leer ist: je Eintrag „`name` — neues 1RM `neuesEinsRM` kg" plus „(vorher: `altesEinsRM` kg)" bzw. „(erste Ausführung)" bei `altesEinsRM === null`. Keine Sektion, kein „Keine Rekorde"-Hinweis, wenn leer — das würde den positiven Moment stören.
- **Streak**: „`streak` Tage in Folge" (Singular „Tag" bei `streak === 1`, analog zur bestehenden Singular/Plural-Behandlung z. B. in `WeeklySummaryList`), immer sichtbar, unabhängig von PRs, während `useTrainingStreak` lädt ein einfaches „…" statt eines eigenen Ladezustands (kurze Zusatzabfrage, kein Layout-Sprung nötig).
- Ein „Fertig"-Button (`buttonPrimaryClass`) navigiert zu `/training`.

Kein Bestätigungs-Dialog, keine Animation — passt zur bestehenden Konvention (kein Rückfragen-Dialog, schlichte Karten-UI, `cardClass`).

## Entscheidung 5: Home-Statuskarte

Vierte Karte in `HomePage.tsx`s `Dashboard`, gleiches Muster wie die drei bestehenden (`cardClass`, `VitaIcon` + Titel, Link in den Bereich): „Streak — `streak` Tage in Folge" mit Link zu `/training`. `useTrainingStreak(userId)` wird direkt in `Dashboard` aufgerufen, wie `useBodyMetrics` es schon tut — kein Umweg über `useHomeAnalysis`.

## Betroffene Dateien

- `src/lib/analysis/training-charts.ts` (neue Funktion `neuePersoenlicheRekorde` + Typ `NeuerRekord`)
- Neu: `src/lib/streak.ts` (`aktuellerStreak`) + Test
- Neu: `src/hooks/use-training-streak.ts` (`useTrainingStreak`) + Test
- `src/hooks/use-workout-session.ts` (neue Funktion `ermittleNeueRekorde`, analog zum bestehenden Query-Stil im Hook)
- `src/pages/WorkoutSessionPage.tsx` (`complete()` setzt Abschluss-State statt sofort zu navigieren; neue Komponente `SessionCompletionScreen`)
- `src/pages/HomePage.tsx` (vierte Statuskarte)

## Tests

- `training-charts.test.ts`: `neuePersoenlicheRekorde` — echte Verbesserung, keine Verbesserung, erste Ausführung (keine vorherige Historie), mehrere Übungen gemischt (eine verbessert, eine nicht), Aufwärmsätze zählen nicht.
- `streak.test.ts`: Lücke unterbricht den Streak, „heute noch nicht trainiert" bricht ihn nicht sofort, genau ein Trainingstag, leere Historie ergibt 0.
- `use-training-streak.test.ts`: lädt nur `beendet_am`, ignoriert `null`-Werte, kein Zeitraum-Filter.
- `WorkoutSessionPage.test.tsx`: nach erfolgreichem Abschluss erscheint der Abschluss-Screen statt sofortiger Navigation; PR-Sektion erscheint nur bei mindestens einem neuen Rekord; „Fertig" navigiert zu `/training`; ein Fehler bei der PR-Zusatzabfrage zeigt trotzdem Dauer/Kalorien/Streak.
- `HomePage.test.tsx`: neue Streak-Karte zeigt den Wert aus `useTrainingStreak` und verlinkt auf `/training`.
- Volle Suite (`npm test`) + Lint + `tsc -b --noEmit` + `npm run build`.
- Live-Verifikation nach Merge: Wegwerf-Plan, ein Training mit einer Übung abschließen, die noch nie trainiert wurde (PR „erste Ausführung"), danach ein zweites Training mit schwererem Gewicht (echter PR mit „vorher"-Wert), Streak-Wert auf dem Abschluss-Screen und auf `/` (Home) auf Übereinstimmung prüfen, Testdaten danach löschen.

## Bewusst außen vor

- **Streak zählt Kalendertage, nicht Wochen** — explizite Nutzer-Entscheidung im Brainstorming, trotz des Zielkonflikts mit Ruhetagen/Split-Plänen, die nicht jeden Tag Training vorsehen.
- **Kein Live-Hinweis direkt nach einem PR-Satz** — PRs werden ausschließlich gesammelt auf dem Abschluss-Screen gezeigt, nicht während des Trainings selbst (Nutzer-Entscheidung: keine Unterbrechung des Trainings-Flows).
- **Keine Konfetti-/Animationseffekte** — passt nicht zur bestehenden, schlichten Design-Sprache der App.
- **Kein Bestätigungs-/Fehler-Dialog bei fehlgeschlagener PR-Abfrage** — der Rest des Abschluss-Screens bleibt trotzdem nutzbar.

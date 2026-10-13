# Design-Spec: Audit-Block 1 – Einheitliches Designsystem

**Stand:** 13.10.2026
**Status:** Vom Nutzer im Chat abschnittsweise bestätigt, wartet auf Review der geschriebenen Spec. Danach `writing-plans`, dann Subagent-Driven Development in einer Worktree.
**Auslöser:** Mobile-Audit `.impeccable/critique/2026-10-13T20-53-41Z__vitaloop-web-app.md` (16/40, Heuristik „Konsistenz“ 1/4). Hauptursache für „uneinheitlich“: die `@layer base`-Übergangsregeln in `src/index.css` laufen parallel zum Phase-6-System.
**Baut auf:** `src/lib/ui-classes.ts` (`cardClass`, `inputClass`, `buttonPrimaryClass`/`Secondary`/`Danger`, `interactiveClass`, `statClass`, `labelClass`, `stickyActionClass`), `Pressable`/`PressableLink`, `Chip`, Tokens in `src/index.css` (`@theme`).

## Einordnung

Die Audit-Funde sind in vier Blöcke aufgeteilt (Nutzer-Entscheidung 13.10.2026), je mit eigener Spec → Plan → SDD:

1. **Einheitliches Designsystem** — diese Spec.
2. Hochwertiger: Hero-Bereich je Tab inkl. Home-Dashboard (ehem. 2d), kompakte Listen, Skeletons, Leerzustände.
3. Ehrliche Daten/Logik (ehem. Vorhaben B).
4. Performance/PWA/Security.

Die beiden P0s sind vorab erledigt (PR #77).

## Entscheidungen

- **Ziel = Variante A:** Der bestehende Phase-6-Look (Karten `rounded-3xl`, Buttons/Felder `rounded-2xl`, heutige Farb-Tokens) wird überall durchgezogen. Kein neues Token-Set. Ergänzt wird nur, was fehlt: Typo-Skala, Abstands-Rhythmus, Flächen-Kontrast.
- **Weg = Hybrid (Variante 3):** Der Basis-Layer schrumpft auf einen neutralen Reset. Alles mit eigenem Aussehen läuft über Rezepte in `ui-classes.ts`. Ein Konsistenz-Test verhindert, dass das Mischsystem zurückkommt.

## 1. Basis-Layer → neutraler Reset (`src/index.css`)

**Bleibt:**
- `#root > *`-Gerüst, `main { flex: 1; padding: 0 16px var(--nav-clearance) }`, `header`-Regel.
- `img { max-width: 100%; height: auto }`.
- `ul { list-style: none; margin: 0; padding: 0 }` (Margin von `16px 0` auf `0`, Abstand kommt aus dem Rhythmus).
- `p { margin: 0 }`.
- `button { min-height: 44px; cursor: pointer }`, `button:disabled { opacity: 0.5; cursor: default }` — die 44-px-Tap-Höhe für `bare`-Pressables (z. B. der kompakte „Entfernen“-Button aus 2b) ist Barrierefreiheit, kein Aussehen.

**Neu bzw. geändert:**
- `button, input, select, textarea { font: inherit; color: inherit; margin: 0 }` — kein Rand, kein Radius, kein Hintergrund, kein Padding.
- `input:not([type="checkbox"]):not([type="radio"]), select { min-height: 44px }`.
- `input[type="checkbox"], input[type="radio"] { accent-color: var(--color-accent) }`.
- `label { display: block }` ohne Margin.
- `a { color: var(--color-accent-text) }` — sonst nichts.
- `h1, h2, h3 { margin: 0; text-align: left }` plus Typo-Skala (Abschnitt 2).
- `main { display: flex; flex-direction: column; gap: 1.5rem }` (Abschnitt 3).

**Fällt weg:** `#2e303a`-Rahmen, 6-px-Radius, `margin: 4px`, `padding: 8px 12px` auf Bedienelementen, `li` mit Flex/Zentrierung/Rahmenlinie, `li form { flex-basis }`, `label { margin: 8px 0 }`, `a { inline-flex; min-height; min-width; padding }`, `main a:not(li a):not(p a) { display: flex }`, die 56-px-`h1`.

Der Kommentar über dem Block wird ersetzt: Er beschreibt den Reset als Fallback und verweist für jedes Aussehen auf `ui-classes.ts`.

## 2. Typografie

- `:root { font: 18px/145% … }` → `font: 18px/1.45 …` (einheitenlos). Ursache des Audit-Funds: Die Prozent-Zeilenhöhe wird einmal in px umgerechnet und so vererbt (h1 36 px mit 23,2 px Zeilenhöhe).
- Feste Skala, linksbündig, ohne Margin:

| Element | Mobil (< 1024 px) | ab 1024 px | Zeilenhöhe | Gewicht | Letter-Spacing |
|---|---|---|---|---|---|
| `h1` | 28 px | 36 px | 1.15 | 600 | −0.02em |
| `h2` | 20 px | 22 px | 1.25 | 600 | −0.01em |
| `h3` | 17 px | 17 px | 1.3 | 600 | normal |

- Die Breakpoint-Grenze bleibt die bestehende `max-width: 1024px` aus `:root`.
- Einzelne Überschriften mit eigenen Klassen (z. B. `text-center` in Kopfzeilen) werden in der Migration geprüft: zentriert bleibt nur, was bewusst zentriert ist (Login-Logo-Bereich, Abschluss-Screen-Kopf); alle Seiten-`h1`/Sektions-`h2` stehen links.

## 3. Abstands-Rhythmus

Drei feste Stufen (Tailwind-Standardstufen, keine neuen Tokens):

| Stufe | Wert | Wo | Umsetzung |
|---|---|---|---|
| Sektion | 24 px | zwischen direkten Kindern von `main` | `main { gap: 1.5rem }` im Reset |
| Karte | 12 px | zwischen Blöcken in einer Karte | `cardClass` bekommt `space-y-3` |
| Gruppe | 8 px | zusammengehörige Bedienelemente | `gap-2` (wie heute) |

- Die Regel steht als Kommentar an `cardClass` und am `main`-Reset.
- In der Migration werden `mt-*`/`mb-*`/`space-y-*` auf direkten Kindern von `main` bzw. auf Seiten-Wrappern entfernt, die sich sonst zum `gap` addieren. Wrapper-`div`s, die eine Seite komplett umschließen, bekommen `flex flex-col gap-6` statt `space-y-*`, damit der Rhythmus darin gleich bleibt.

## 4. Flächen-Regel

Drei Ebenen, unabhängig davon, wo ein Element liegt:

| Ebene | Token | Wofür |
|---|---|---|
| Seite | `bg` | Hintergrund |
| Karte | `surface` | `cardClass`, Dialoge |
| Bedienelement | `surface-raised` | Felder (`inputClass`, schon so), Secondary-/Danger-Buttons, inaktive Chips |

- `buttonSecondaryClass` und `buttonDangerClass`: `bg-surface` → `bg-surface-raised`.
- `Chip` inaktiv: `bg-surface text-text-muted` → `bg-surface-raised text-text`. `text-muted` auf `surface-raised` liegt bei ca. 3,2:1 und fällt unter WCAG AA (4,5:1).
- **Karte in Karte ist verboten.** Innere Gruppen werden zu Listenzeilen mit Trennlinie (`listClass`/`listRowClass`) oder zu reinem Abstand.

## 5. Neue Rezepte (`src/lib/ui-classes.ts`)

Nur was die Funde brauchen, keine Wrapper-Komponenten:

| Rezept | Inhalt (Richtwert) | Ersetzt |
|---|---|---|
| `fieldLabelClass` | `flex flex-col gap-1.5 text-sm font-medium text-text-muted` | `label { display:block; margin }` + Inline-Labels |
| `checkLabelClass` | `flex min-h-11 items-center gap-3 text-text` | Checkbox-Labels |
| `linkClass` | `inline-flex min-h-11 items-center text-accent-text underline-offset-4 hover:underline` + Fokus-Ring aus `interactiveClass` | `a`-Basisregel, gestapelte zentrierte Links |
| `listClass` | `divide-y divide-text-muted/15` | `ul { margin }` + `li { border-bottom }` |
| `listRowClass` | `flex items-center gap-3 py-3` | `li { flex; center; padding }` |

- `select` nutzt `inputClass`, kein eigenes Rezept.
- Das Feld in einem `fieldLabelClass`-Label behält `inputClass`; der Feldtext ist dort über `text-text` aus `inputClass` hell, nicht muted.
- Unverändert: `buttonPrimaryClass`, `inputClass`, `statClass`, `labelClass`, `stickyActionClass`, `interactiveClass`, `Pressable`-API.

## 6. Migration

Ein Branch, ein PR. Tasks nach Bereich:

1. **Fundament:** Reset + Typo + Rhythmus in `index.css`, Flächen-Regel + neue Rezepte in `ui-classes.ts`, `Chip`, Kontrast-Tests.
2. **Training:** `TrainingPage`, `TrainingPlansPage`, `TrainingPlanEditPage`, `TrainingPlanWizardPage`, `WorkoutSessionPage`, `TrainingHistoryPage`, `TrainingHistoryDetailPage`, `ExercisesPage` (inkl. „Eigene Übung“-Formular), `ExercisePicker`.
3. **Ernährung:** `NutritionPage`, `ManualProductForm`, `FoodEntryEditForm`, `AddEntryFlow`, `ProductPicker`, `FoodEntryList`, `CalorieGoalEditor`, `NutritionEntriesPage`.
4. **Körper:** `BodyPage`, `BodyEntriesPage`, `BodyEntryForm`, `BodyPhotosPage`.
5. **Profil, Login, Dialoge, Analyse:** `ProfilePage`, `LoginPage`, `Dialog`, `ExerciseDetailDialog`, `HomePage`, `HomeAnalysisPage`, `TrainingAnalysisPage`, `NutritionAnalysisPage`, `BodyAnalysisPage` soweit betroffen, Chart-Bausteine (`ExerciseSelect`, `ChartPicker`, `WeeklySummaryList`, `PhotoTimeline`, `PersonalRecordsList`, `ActivityGridChart`).
6. **Konsistenz-Test + Screenshot-Abgleich.**

Die Dateiliste ist der Stand der Bestandsaufnahme vom 13.10.2026 (rohe `button`/`input`/`select`/`li`/`label` ohne Rezept). Der Plan prüft sie per `grep` nach und ergänzt Fehlendes; Seiten, die nur über den Reset betroffen sind (z. B. `HomePage`), werden im Screenshot-Abgleich kontrolliert.

**Muster je Datei:**
- rohe Felder → `inputClass`; Labels → `fieldLabelClass` bzw. `checkLabelClass`;
- rohe Buttons → `Pressable` mit passender Variante;
- Textlinks → `linkClass` (Links, die wie Buttons aussehen, bleiben `PressableLink` mit Variante);
- Listen → `listClass` am `ul`, `listRowClass` am `li` (Listen, die schon eigene Karten-/Grid-Klassen haben, bleiben, sofern sie keine Basis-`li`-Optik mehr brauchen);
- Karte-in-Karte auflösen;
- doppelte Abstände unter `main` entfernen, Überschriften links.

**Im Umfang (Konsistenz-Funde aus dem Audit):** Überlappung „Training starten“/„Meine Pläne“ auf `/training`, gemischt zentrierte/linke Überschriften, gestapelte zentrierte Textlinks, unsichtbare Chips/Secondary-Buttons/verschachtelte Karten in Karten.

**Nicht im Umfang:** Hero-Bereiche, Skeletons, Leerzustände, Home-Dashboard (Block 2); Logik, Texte, Übersetzungen (Block 3); Virtualisierung, Bildgrößen, Caching (Block 4). Funde unterwegs werden im Status-Abschnitt von `CLAUDE.md` beim passenden Block notiert, nicht nebenbei behoben.

## 7. Absicherung

- **Konsistenz-Test** `src/lib/design-consistency.test.ts`: liest alle `.tsx` unter `src/` ohne `*.test.tsx` per `import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true })` (keine Node-APIs, passt zur browser-only-tsconfig). Er schlägt fehl bei:
  - `<button` ohne `className` außerhalb von `src/components/Pressable.tsx`;
  - `<input` ohne `className`, außer `type="checkbox"`, `type="radio"`, `type="file"`;
  - `<select` ohne `className`;
  - einem `cardClass`-Element, in dessen JSX-Block innerhalb derselben Datei ein weiteres `cardClass` steckt, soweit per Text erkennbar.
  Die Fehlermeldung nennt Datei und Zeile. Der Test ist ein Regex-Netz, kein Parser: `shortcut: erkennt nur Muster im selben Tag/derselben Datei, bei Fehlalarmen oder durchrutschenden Fällen auf einen AST-Check (TypeScript-Compiler-API) umstellen`.
- **Kontrast** (`src/lib/contrast.test.ts`): `text` auf `surface-raised` (≥ 4,5:1), `text-muted` auf `surface` (≥ 4,5:1, besteht schon), `accent-text` auf `surface` (≥ 4,5:1), `text-muted` auf `surface-raised` als dokumentierter Fehlschlag (< 4,5:1, deshalb nicht für Chips verwendet).
- **Bestehende Tests:** Abfragen nach Rolle/Label bleiben; Tests, die alte Klassen oder Basis-Optik prüfen (z. B. `ui-classes.test.ts`), werden angepasst.
- **Visuell:** Playwright-Screenshots aller Hauptrouten bei 390 px Breite (Stichproben 1024 px) gegen die lokale Dev-Instanz mit Testkonto, vorher (Task 1 noch nicht angewendet) und nachher. Abgleich per Augenschein: keine Altlast-Optik, keine Doppelabstände, keine unsichtbaren Elemente in Karten, keine Überdeckung durch die Bottom-Nav. Ergebnis kurz im PR.
- **Prozess:** Review je Task, Whole-Branch-Review, `codex review -c model="gpt-5.6-sol" --base master` als Zweitmeinung, Merge, Deploy nach Deploy-Regel. Bundle-Marker: der Klassen-String von `listRowClass` im gebauten CSS/JS.

## Erfolgskriterien

- `@layer base` enthält keine Aussehen-Regeln mehr (Rand, Radius, Hintergrund, Zentrierung, Padding auf Bedienelementen).
- Keine Datei unter `src/` verletzt den Konsistenz-Test.
- Auf allen Hauptrouten bei 390 px: Überschriften links in der festen Skala, 24 px zwischen Sektionen, Bedienelemente in Karten sichtbar abgehoben, keine Karte in Karte.
- `npx vitest run`, `npm run lint`, `npx tsc -b --noEmit` grün.

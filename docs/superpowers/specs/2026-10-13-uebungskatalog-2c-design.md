# Design-Spec: Redesign Phase 2c – Übungskatalog und Übungsauswahl

**Stand:** 13.10.2026
**Status:** Vom Nutzer im Chat bestätigt, wartet auf Review der geschriebenen Spec. Danach `writing-plans`, dann Subagent-Driven Development in einer Worktree.
**Übergeordnete Spec:** `docs/superpowers/specs/2026-09-23-visuelles-interaktions-redesign-design.md` (Filter-Kollaps, Listen-/Daten-Reveals).
**Baut auf:** `Pressable` (`src/components/Pressable.tsx`), `Chip`, `VitaIcon` (Icons `search`, `close` vorhanden), `inputClass`/`cardClass`/`interactiveClass` (`src/lib/ui-classes.ts`).

## Ausgangslage

`ExerciseFilterChips` (`src/components/ExerciseFilterChips.tsx`) zeigt immer beide Chip-Reihen komplett (Muskelgruppen + Geräte, rund 29 Chips). Genutzt wird die Komponente an zwei Stellen: im Katalog `/training/exercises` (`src/pages/ExercisesPage.tsx`) und in der Übungsauswahl im Dialog (`src/components/ExercisePicker.tsx`). Im Katalog steht die Chip-Wand sogar vor dem Suchfeld.

## Entscheidung

Nutzer-Entscheidung (13.10.2026): **Variante A — inline aufklappen.** Kein Bottom-Sheet: der Picker ist selbst schon ein Dialog, ein Dialog im Dialog würde vermieden.

## Umfang

### 1. `ExerciseFilterChips` – einklappbarer Filter

- Props-Schnittstelle bleibt **unverändert**, beide Aufrufer bekommen das Verhalten automatisch.
- Neue Kopfzeile: ein `Pressable` (Variante `secondary`) mit Text „Filter“, bei aktiven Filtern mit Zähler „Filter (N)“ (N = Anzahl der Filter ungleich `null`, also 0–2). Er trägt `aria-expanded` und `aria-controls` (auf die Panel-ID, per `useId()`).
- Unter der Kopfzeile erscheint für jeden aktiven Filter ein Chip mit Label und `close`-Icon, z. B. „Brust ×“ (Label über `muskelgruppeLabel` bzw. `equipmentLabel`). Der zugängliche Name lautet „Filter Brust entfernen“. Ein Tipp setzt genau diesen Filter auf `null`. Diese Chips sind auch bei zugeklapptem Panel sichtbar, damit aktive Filter nie verborgen sind.
- Die beiden bestehenden Chip-Reihen liegen in einem Panel. Unter dem Breakpoint `md` (768 px) ist es standardmäßig **zu**. Ab `md` ist es immer offen und der Trigger ausgeblendet. Das wird per CSS gelöst, nicht per JS-Media-Query: Trigger `md:hidden`, Panel `hidden md:block`, offen zusätzlich `block`. Die Entfernen-Chips sind ab `md` ebenfalls ausgeblendet (`md:hidden`), weil der aktive Chip dort ohnehin in der Reihe markiert ist.
- Der Auf/Zu-Zustand liegt lokal in der Komponente (`useState(false)`). Eine Auswahl im Panel klappt es **nicht** automatisch zu, weil man oft Muskelgruppe und Gerät zusammen setzt.
- Kein animiertes Auf-/Zuklappen, schlichtes Ein-/Ausblenden.
- Kommen keine Muskelgruppen und keine Geräte vor (leere Liste), rendert die Komponente gar nichts, auch keinen Trigger.

### 2. Katalog `ExercisesPage`

- Das Suchfeld steht **vor** den Filtern, mit `inputClass` und einem `search`-Icon. Das Label bleibt „Suche“, als sichtbares oder per `sr-only` versteckt verbundenes Label, sodass `getByLabelText('Suche')` weiter funktioniert.
- Jede Katalog-Zeile bekommt unter dem Namen dieselbe Unterzeile wie im Picker: Gerät · erste primäre Muskelgruppe, `text-sm text-text-muted`. Die Logik wird aus `ExercisePicker.tsx` in eine gemeinsame Funktion `exerciseCaption(exercise): string` in `src/lib/exercise-caption.ts` gezogen und an beiden Stellen genutzt (leerer String, wenn beides fehlt; dann keine Unterzeile).
- Bei leerem Ergebnis steht „Keine Übungen gefunden.“ da (wie im Picker).

### 3. Listen-Reveal

- Die Zeilen im Katalog und im Picker erscheinen beim ersten Rendern gestaffelt: CSS-Keyframe (`src/index.css`, Klasse `list-in`, Opacity + 4 px Versatz, 250 ms) mit `animation-delay` pro Index, **gedeckelt auf die ersten 12 Zeilen** (`Math.min(index, 12) * 30 ms`), damit eine lange Liste nicht sekundenlang nachläuft. Unter `prefers-reduced-motion: reduce` ist `animation: none`.
- Beim Filtern oder Suchen läuft der Reveal für bereits gemountete Zeilen nicht erneut (React behält die `key`-Elemente). Neu hinzukommende Zeilen blenden mit ein, das ist gewollt.
- Kein GSAP für diesen Reveal (kein Bundle-Gewicht, gleiche Entscheidung wie in 2b).

## Außerhalb des Scopes

- Umgestaltung von Dialog und Formular „Eigene Übung anlegen“.
- Pagination oder Virtualisierung der langen Liste.
- Änderung der Gruppierung im Picker.
- Home-Dashboard (2d) und Vorhaben B.

## Fehlerbehandlung

Reine Darstellungsänderung, keine neuen Datenpfade. Bestehende Lade- und Fehlerzustände von `ExercisesPage` und `ExercisePicker` bleiben unverändert.

## Testing

- **Vitest/RTL, `ExerciseFilterChips`:**
  - Zugeklappt trägt das Panel die Klasse `hidden` (ohne `block`), aufgeklappt `block`. jsdom wertet Tailwind nicht aus, deshalb wird die Klasse geprüft. Das HTML-Attribut `hidden` scheidet aus, weil Tailwind 4 es per `display: none !important` erzwingt und `md:block` es dann nicht mehr aufheben könnte.
  - Der Trigger öffnet und schließt das Panel und `aria-expanded` wechselt.
  - Der Zähler zeigt „Filter (2)“ bei zwei aktiven Filtern.
  - Der Entfernen-Chip ruft den richtigen Callback mit `null` auf.
  - Ohne Werte wird nichts gerendert.
- **`exerciseCaption`:** Unit-Tests für beides vorhanden, nur Gerät, nur Muskelgruppe, nichts.
- **Bestehende Tests** von `ExercisesPage`, `ExercisePicker` und `TrainingPlanEditPage`, die Chips anklicken, öffnen vorher den Filter. Diese Anpassung ist erwartet.
- **`playwright-cli`:** bei 390×844 sind beim Öffnen von `/training/exercises` Suche und erste Zeilen ohne Scrollen sichtbar, die Chip-Wand nicht; bei 1024 px sind die Chips direkt sichtbar und kein Trigger. Unter Reduced Motion gibt es keine Animation.

# Design-Spec: Redesign Phase 2b – Trainings-Session + Abschluss-Screen

**Stand:** 13.10.2026
**Status:** Entwurf, wartet auf Nutzer-Review. Danach `writing-plans`, dann Subagent-Driven Development in einer Worktree.
**Übergeordnete Spec:** `docs/superpowers/specs/2026-09-23-visuelles-interaktions-redesign-design.md` (Feier-Momente, Listen-/Daten-Reveals, Daumenzone).
**Baut auf Phase 2a auf:** `Pressable`/`PressableLink`, `usePressFeedback`, `loadGsap()`, `prefersReducedMotion()`, `statClass`/`labelClass`/`stickyActionClass` (`src/lib/ui-classes.ts`), `--nav-clearance`.

## Entscheidung zum Umfang

Nutzer-Entscheidung (13.10.2026): **Variante A — Politur am bestehenden Aufbau.** Das Akkordeon pro Übung in `WorkoutSessionPage.tsx` bleibt, der Interaktionsfluss (Übung öffnen → Satz erfassen → Pause → nächste Übung) bleibt unverändert. Kein Fokus-Modus, kein Schema, keine neue Route.

## Umfang

### 1. Abschluss-Screen (`SessionCompletionScreen`)

- Dauer (Minuten) und Kalorien als zwei große Kennzahlen mit `statClass` und `labelClass` statt des heutigen Fließtext-Satzes `„42 Minuten · 310 kcal"`. Fehlen die Kalorien (`null`), wird nur die Dauer angezeigt.
- **Feier-Sequenz** in einer eigenen Leaf-Komponente (z. B. `src/components/CompletionCelebration.tsx`). Sie lädt GSAP über `loadGsap()`, nutzt `gsap.context()` und gibt es beim Unmount mit `revert()` wieder frei:
  1. Die Kennzahlen zählen von 0 auf ihren Wert hoch (ca. 0,8 s, `tabular-nums`, damit nichts springt).
  2. PR-Karten erscheinen gestaffelt, jede mit einem einmaligen Highlight-Sweep (Verlauf in der Akzentfarbe läuft einmal über die Karte).
  3. Die Streak-Zeile blendet zuletzt ein.
- PR-Zeilen werden strukturiert statt als ein langer String: Übungsname, darunter das neue 1RM groß (`statClass` kleiner skaliert) und „vorher: X kg" bzw. „erste Ausführung" gedämpft.
- „Fertig" bleibt die Primäraktion, mit `stickyActionClass`.
- **Reduced Motion / GSAP-Importfehler:** Es wird sofort der statische Endzustand mit den finalen Zahlen gerendert. Die Zahlen stehen immer im DOM (Endwert als Text), die Animation setzt nur temporär darüber. Ein Screenreader oder ein Test sieht also nie „0".

### 2. Session-Screen (`LiveSession`)

- **Daumenzone:** „Training abschließen" bekommt `stickyActionClass`. „Übung hinzufügen" wird zu `secondary`, damit nur eine Primäraktion am unteren Rand klebt.
- **„Entfernen"-Button:** Variante `danger`, kompakt (kleineres Padding, Icon + Text), rechts neben dem Übungsnamen in der Kartenkopfzeile statt als eigener Block. Der Übungsname-Button wird als Kartenkopf gestaltet (linksbündig, `font-semibold`, volle Breite minus Entfernen-Button).
- **Geloggte Sätze (`LoggedSets`):** ein Gitter mit Spalten Satz / kg / Wdh. / RIR, getrennt durch 1px-Linien (`border-text-muted/20`), Zahlen mit `tabular-nums`. RIR fehlt heute in der Anzeige und wird ergänzt („—", wenn leer). Die Zeile eines neu erfassten Satzes wird kurz eingeblendet (gestaffelter Reveal nur für neu hinzukommende Zeilen, nicht bei jedem Aufklappen der ganzen Liste).
- **Pausen-Timer:** große Restzeit (`statClass`, Format `m:ss`) mit dem Label „Pause" in einer Karte, oben im Screen sichtbar, solange die Pause läuft. Die Logik von `PauseTimer` (Zielzeitpunkt statt Tick) bleibt unverändert.
- **Gewichtsanzeige** (`<p>{gewichtKg} kg</p>`) erhält ein Label („Körpergewicht für die kcal-Berechnung") mit `labelClass`, statt als unbeschriftete Zahl über dem Abschluss-Button zu stehen.

### 3. Übersetzungs-Leck (aus Vorhaben B vorgezogen, weil derselbe Screen)

Ursache: `use-workout-session.ts` lädt aus `exercises` nur `name` (Zeile 170 Session-Übungen, Zeile 330 PR-Namen). Fix: zusätzlich `name_de` selektieren und `name_de ?? name` verwenden, analog zu `ExercisesPage`/`ExercisePicker`. Damit sind sowohl die Übungsnamen im Session-Screen als auch die PR-Namen auf dem Abschluss-Screen deutsch. Der Fallback auf `name` bleibt für eigene Übungen ohne Übersetzung.

## Außerhalb des Scopes

- Fokus-Modus / Umbau des Session-Flows (Variante B, ggf. spätere eigene Runde).
- Übungskatalog/-Picker und Chip-Wand (Phase 2c), Home-Dashboard (2d).
- Übrige Vorhaben-B-Punkte (`lang="de"`, Plan-Assistent-Validierung, Dezimal-Locale, unbehandelte Routen).
- Konfetti/Partikel, Sound, Haptik.

## Fehlerbehandlung

- GSAP-Import schlägt fehl: Der statische Endzustand bleibt sichtbar, kein Fehler-Toast (Animation ist Zusatzschicht).
- Alle bestehenden Fehlerpfade (Satz nicht gespeichert, Abschluss fehlgeschlagen, PR-Ermittlung fehlgeschlagen → Abschluss-Screen ohne PR-Sektion) bleiben unverändert.

## Testing

- **Vitest/RTL:** Abschluss-Screen zeigt Dauer/kcal als Endwerte (auch ohne GSAP, `loadGsap` gemockt bzw. Reduced Motion), PR-Zeilen strukturiert, ohne kcal nur Dauer; `LoggedSets` rendert die RIR-Spalte und „—" für leere Werte; Pausen-Timer im Format `m:ss`; der Hook liefert `name_de` mit Fallback auf `name` (Session-Übungen und PR-Namen); der Entfernen-Button ist weiterhin nur sichtbar, solange die Übung keine Sätze hat. Bestehende `WorkoutSessionPage.test.tsx`-Tests bleiben grün bzw. werden nur bei geänderten Texten (z. B. `Pause: 42s` → `0:42`) angepasst.
- **`playwright-cli`, 390×844:** „Training abschließen" klebt über der Nav (Unterkante < Nav-Oberkante) und wird von einem Klick in die Mitte getroffen; Kennzahl-Typografie 700/`tabular-nums`; Reduced Motion lädt kein `gsap.js` auf dem Abschluss-Screen.
- **Live-Verifikation** nach Deploy mit Wegwerf-Plan (danach löschen, Plan „Test" wieder aktivieren).

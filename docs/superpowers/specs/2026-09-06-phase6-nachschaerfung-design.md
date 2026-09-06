# Phase-6-Nachschärfung: Design-Überarbeitung nach Critique

**Ziel:** Die drei P1- und zwei P2-Befunde aus dem impeccable-Critique gegen die Live-App beheben — ohne die visuelle Sprache (Farben/Formen aus dem Referenzvideo) zu ändern. Der Nutzer empfand das gemergte Phase-6-Ergebnis als "langweilig" und "nicht interaktiv"; das Critique hat konkrete, mechanische Ursachen dafür gefunden, keine grundsätzliche stilistische Neuausrichtung nötig.

## Ausgangslage

impeccable-Critique (dual-agent: Design-Review + Detector/Browser-Evidenz) gegen `https://vitaloop.web.app`, Snapshot: `.impeccable/critique/2026-09-06T15-36-50Z__vitaloop-web-app.md`. Design Health Score 19/40 ("Poor"). Vom Nutzer bestätigte Priorität:

1. **[P1] Null CSS-Transitions/Hover/Active/Focus-States im gesamten Code** — mechanische Hauptursache für "nicht interaktiv".
2. **[P1] Drei Kontrast-Token-Paare scheitern an WCAG AA** (einer davon vom Detector gefunden, zwei beim Spec-Entwurf zusätzlich durchgerechnet, siehe unten).
3. **[P1] `/profile` + `CalorieGoalEditor`** wurden bei allen vier Phase-6-Bereichsplänen vergessen, rendern noch mit unstyled nativen Controls.
4. **[P2] Akzent-Lila** wird für reine Navigationslinks und primäre CTAs identisch verwendet.
5. **[P2] Wall-of-Options**: 873-Zeilen-Übungsliste ohne Gruppierung, vier gleichrangige "+ Hinzufügen"-Buttons auf `/nutrition/entries`.

## Nicht-Ziele

- **Keine Änderung der Akzentfarbe, Formensprache oder des Referenzvideo-Looks.** Nutzer-Antwort auf die Tonalitätsfrage war explizit "Bewegung/Feedback", nicht "bolder/verspielter" — die Farbpalette bleibt exakt wie in Phase 6 pixelgenau übernommen.
- **taste-skill, awesome-design-md, img2threejs** kommen in dieser Runde nicht zum Einsatz (Nutzer-Entscheidung) — bleiben für ein künftiges Vorhaben vorgemerkt, falls dort mal ein echter visueller Richtungswechsel ansteht.
- **Home-Dashboard-Plan** (`docs/superpowers/plans/2026-09-06-home-dashboard-plan.md`, 0/8 Tasks) wird **nicht** Teil dieses Vorhabens. Er baut ausschließlich auf den hier reparierten geteilten Bausteinen auf und wird danach unverändert umgesetzt — er erbt die Fixes automatisch.
- **Fix-Tiefe eng am Befund** (Nutzer-Entscheidung): nur genau die 5 gefundenen Punkte beheben, keine ungefragten Erweiterungen über impeccables eigene "go all out"-Grundhaltung hinaus.

## Werkzeuge

Laut `CLAUDE.md`-Abschnitt "Design-Workflow": **impeccable** als Haupt-Skill (Kritik lief bereits darüber), **playwright-cli** für die Verifikation der Motion-/Kontrast-Fixes in den drei Plänen.

## Umsetzung: drei getrennte, sequenzielle Pläne

Nach demselben Muster wie die vier Phase-6-Bereichspläne (eigener Worktree/Branch/PR je Plan), in dieser Reihenfolge:

### Plan 1: Design-Tokens (Motion + Kontrast)

**Betroffene Dateien:** `src/index.css`, `src/lib/ui-classes.ts`, `src/components/Chip.tsx`, `src/components/ToastProvider.tsx`, `src/components/BottomNav.tsx`.

**Kontrast** — exakt berechnet (WCAG-Kontrastformel, relative Luminanz) gegen jeden Hintergrund, auf dem der jeweilige Wert tatsächlich vorkommt:

| Token | Alt | Neu | Kontrast alt → neu |
|---|---|---|---|
| `--color-text-muted` | `#5e5f66` | **`#90919a`** | 2,4:1 (surface) / 1,6:1 (nav-Pille) → 4,9:1 (surface) / 3,2:1 (nav-Pille) |
| *(neuer Token)* `--color-on-bright` | — | **`#0d0e12`** | Ersetzt `--color-text`/`#fefeff` als Textfarbe überall, wo Text auf `--color-accent` oder `--color-danger` sitzt |

`--color-on-bright` auf `--color-accent` (`#8766ed`): 4,04:1 → 4,73:1. Auf `--color-danger` (`#f27a6b`): 2,68:1 → 6,55:1 (dieser dritte Fund — Fehler-Toast-Text — kam beim Durchrechnen der ersten zwei zusätzlich zutage; der Detector sah ihn nicht, weil im geprüften Account nie ein Error-Toast auftrat).

Konkret geändert: `buttonPrimaryClass` (`text-text` → `text-on-bright`), `Chip`'s aktiver Zustand (`text-text` → `text-on-bright`), `ToastProvider`'s Danger-Variante (`text-text` → `text-on-bright`). Die Akzentfarbe selbst (`--color-accent`) bleibt exakt `#8766ed` — nur die Textfarbe *darauf* ändert sich.

Bewusst **nicht** angefasst: `src/lib/analysis/chart-colors.ts`s `CHART_GRID`/`CHART_VIOLET` — eigene hartkodierte Literale für Recharts (siehe Kommentar dort, aus genau diesem Grund keine `var(...)`-Referenz auf die CSS-Tokens), keine Textelemente, nicht Teil der Befunde.

**Motion** — nur Tailwind-Utilities, keine neue Abhängigkeit:

- `buttonPrimaryClass`, `buttonSecondaryClass`, `Chip`: `transition-colors` + `hover:brightness-110` + `active:scale-[0.97]` + `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg`.
- `motion-reduce:` Variante schaltet den Scale-Effekt für `prefers-reduced-motion`-Nutzer ab; die Farbänderung (`hover:brightness-110`) bleibt, da das keine Bewegung ist.
- Gilt nur für echt interaktive Elemente (Buttons, Chips, Links, tappbare Listenzeilen) — nicht für rein informative Karten ohne Aktion, sonst entsteht eine falsche Interaktions-Erwartung.
- `ToastProvider`: kurzer Enter/Exit-Übergang (aktuell erscheint/verschwindet der Toast ohne jede Animation).

**Verifikation:** `impeccable detect --json` erneut gegen die geänderten Seiten — muss die 3 Kontrastfunde auf 0 bringen. Manuelle Browser-Verifikation (playwright-cli) für Hover/Active/Focus-States und `prefers-reduced-motion`.

### Plan 2: Profil nachziehen

**Betroffene Dateien:** `src/pages/ProfilePage.tsx`, `src/components/CalorieGoalEditor.tsx`.

Beide Dateien auf `cardClass`/`buttonPrimaryClass`/`buttonSecondaryClass` heben, wie der Rest der App seit Phase 6. Reiner Anwendungsfall der (durch Plan 1 bereits reparierten) geteilten Bausteine — kein neuer Design-Baustein nötig. Detector meldete zusätzlich eine zu lange Zeile (~122 Zeichen) im Mahlzeiten-Hilfetext auf `/profile` — im selben Rutsch umbrechen.

**Verifikation:** manuelle Browser-Verifikation (visueller Abgleich mit den restlichen Bereichen), `npm run lint`/`tsc`/Tests wie gewohnt.

### Plan 3: Wall-of-Options

**Betroffene Dateien:** `src/pages/ExercisesPage.tsx`, `src/pages/NutritionEntriesPage.tsx`.

- `ExercisesPage.tsx`: Muskelgruppen-`Chip`-Filterreihe über der Namenssuche. Daten existieren bereits (`muskelgruppen_primaer`, wird schon für den T6-Graphen zwei Klicks weiter verwendet) — keine neue Abfrage nötig, nur eine zusätzliche Filterbedingung neben der bestehenden `.filter(name.includes(query))`.
- `NutritionEntriesPage.tsx`: von den vier gleichrangigen "+ Hinzufügen"-Buttons (je Mahlzeiten-Abschnitt) drei auf `buttonSecondaryClass` herabstufen, sodass eine klare visuelle Rangfolge entsteht statt vier identisch gewichteter CTAs.

**Verifikation:** Tests für die neue Filterlogik (Vitest, wie bei jeder anderen reinen Funktion im Projekt), manuelle Browser-Verifikation für die visuelle Rangfolge auf `/nutrition/entries`.

## Reihenfolge und Abhängigkeiten

Plan 1 → Plan 2 → Plan 3, sequenziell, je eigener Worktree/Branch/PR/Merge/Deploy/Wiki-Sync wie bei den Phase-6-Bereichsplänen. Plan 2 und 3 sind von Plan 1 nur insofern abhängig, als sie die dort reparierten Klassen konsumieren — kein technischer Blocker, aber inhaltlich sinnvoll in dieser Reihenfolge, damit Profil und die Listen-Seiten nicht zweimal angefasst werden müssen. Nach Abschluss aller drei Pläne: Re-Run von `/impeccable critique` gegen die Live-App, um den Score-Fortschritt zu dokumentieren (Trend-Funktion von `critique-storage`). Danach, als **separates, unverändertes Vorhaben**: der bereits committete Home-Dashboard-Plan.

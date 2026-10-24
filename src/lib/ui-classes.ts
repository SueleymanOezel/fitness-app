/**
 * Shared Tailwind class recipes for the Phase 6 design system. One string
 * per role, reused everywhere that role appears, so the look changes in one
 * place instead of at every call site. Card and the two button variants
 * carry no state or behaviour, so a wrapper component would add an API
 * surface for nothing — a plain class string is the whole job.
 */

/**
 * Rhythmus (Block 1): 24px zwischen Sektionen kommt aus dem Basis-Layer
 * (main > *), 12px zwischen Blöcken in einer Karte kommt von hier
 * (space-y-3), 8px zwischen zusammengehörigen Bedienelementen ist gap-2
 * am Aufrufer. Eine Karte liegt nie in einer anderen Karte.
 */
export const cardClass = 'bg-surface rounded-3xl p-6 space-y-3'

/**
 * Explizite transition-[...]-Liste (ohne transform/scale) + motion-reduce:transition-none statt eines separaten
 * motion-safe:-Zweigs: der Zustandswechsel selbst (Farbe; die Press-Skalierung macht GSAP, siehe press-feedback.ts) soll
 * unter prefers-reduced-motion bestehen bleiben, nur ohne animierten
 * Uebergang dazwischen — siehe Spec, Abschnitt "Motion".
 *
 * Bewusst KEIN nacktes `transition`: das umfasst in Tailwind 4 auch transform/scale,
 * GSAP schreibt aber jedes Frame inline — die CSS-Transition wuerde den Press
 * verzoegern und das Elastic-Overshoot daempfen.
 *
 * Exportiert (nicht nur hier verwendet): Chip und BottomNav brauchen
 * dieselbe Hover/Press/Fokus-Basis, nur mit einer anderen
 * focus-visible:ring-offset-Farbe (die haengt davon ab, auf welchem
 * Hintergrund das Element sitzt) — die traegt jeder Aufrufer selbst bei,
 * statt die ganze Liste ein drittes/viertes Mal zu tippen.
 */
export const interactiveClass =
  'transition-[color,background-color,border-color,box-shadow,filter,opacity] duration-150 motion-reduce:transition-none hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export const buttonPrimaryClass =
  `w-full rounded-2xl border-0 bg-accent px-4 py-3 font-semibold text-on-bright disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

/**
 * Flächen-Regel (Block 1): Bedienelemente liegen immer auf surface-raised —
 * auf bg-surface wären sie in einer Karte unsichtbar (Audit 13.10.2026).
 */
export const buttonSecondaryClass =
  `rounded-2xl border-0 bg-surface-raised px-4 py-3 font-semibold text-text disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

/** Destructive action (delete, remove): same shape as secondary, danger-colored text. */
export const buttonDangerClass =
  `rounded-2xl border-0 bg-surface-raised px-4 py-3 font-semibold text-danger-text disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

/** Large figure (weight, PR, calories): bold, tight, digits that do not jump. */
export const statClass = 'font-display text-4xl font-bold tabular-nums'

/** Quiet label above/next to a figure: visibly a different weight than the value. */
export const labelClass = 'text-sm font-medium text-text-muted'

/**
 * bg-surface-raised statt bg-surface: ein Feld muss sich auch abheben, wenn
 * es (wie ueberall ausser /login) in einer cardClass-Karte liegt — bg-surface
 * waere dort mit der Karte selbst identisch und damit unsichtbar, exakt der
 * Bug, der beim Google-Button auf /login zuerst auffiel.
 */
export const inputClass =
  'w-full rounded-2xl border border-text-muted/30 bg-surface-raised px-4 py-3 text-base font-normal text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-invalid:border-danger'

/**
 * For a primary action that would otherwise sit low enough on a page to
 * collide with the floating bottom nav (see the P0 finding in
 * .impeccable/critique/2026-09-23T00-41-12Z__vitaloop-web-app.md — /body's
 * "Heute eintragen" button was 57-69% hidden behind the nav at initial
 * page load). Sticks the action to `--nav-clearance` (src/index.css) from
 * the bottom of the viewport once the page scrolls that far, instead of
 * letting it scroll into the nav's own fixed band.
 */
export const stickyActionClass = 'sticky bottom-[var(--nav-clearance)] z-10'

/** Label über seinem Feld; das Feld darin trägt inputClass (heller Text). */
export const fieldLabelClass = 'flex flex-col gap-1.5 text-sm font-medium text-text-muted'

/** Checkbox/Radio links, Text rechts, eine 44px-Zeile. */
export const checkLabelClass = 'flex min-h-11 items-center gap-3 text-text'

/**
 * Bereichs-/Zurück-Link als eigene Zeile (ersetzt die alte a-Basisregel).
 * Links im Fließtext bekommen keine Klasse, nur die Farbe aus dem Basis-Layer.
 */
const linkBaseClass = `inline-flex min-h-11 items-center gap-2 rounded-lg underline-offset-4 hover:underline ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`
export const linkClass = `${linkBaseClass} text-accent-text`

/**
 * A navigation row in a list (Pläne, Historie, Analyse …): text colour with a chevron, so the
 * lilac stays the signal for actions (re-audit 24.10.2026). Inline text links keep linkClass.
 */
export const rowLinkClass = `${linkBaseClass} text-text`

/** Liste in einer Karte: Zeilen mit dezenter Trennlinie statt Karte in Karte. */
export const listClass = 'divide-y divide-text-muted/15'

export const listRowClass = 'flex items-center gap-3 py-3'

/** Platzhalter-Block für Ladezustände; pulsiert nur ohne prefers-reduced-motion. */
// Card color, not surface-raised: a chart skeleton behind the nav pill (same raised color) merged
// with it, and on the iPhone the nav looked like it swelled into a big bar for a frame (user video 23.10.2026).
export const skeletonClass = 'rounded-2xl bg-surface animate-pulse motion-reduce:animate-none'

/** Titel eines PageHero: eine Stufe unter statClass, damit er neben dem Ring nicht umbricht. */
export const heroTitleClass = 'font-display text-3xl font-bold tabular-nums'

/** Kennzahl-Kachel im StatStrip: eigene Fläche auf der Seite, Label und Wert eine Stufe kleiner als im Hero. */
export const tileClass = 'rounded-2xl bg-surface p-3 space-y-1'
export const tileLabelClass = 'text-xs font-medium text-text-muted'
export const tileValueClass = 'font-display text-2xl font-bold tabular-nums'

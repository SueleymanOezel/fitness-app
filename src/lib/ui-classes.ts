/**
 * Shared Tailwind class recipes for the Phase 6 design system. One string
 * per role, reused everywhere that role appears, so the look changes in one
 * place instead of at every call site. Card and the two button variants
 * carry no state or behaviour, so a wrapper component would add an API
 * surface for nothing — a plain class string is the whole job.
 */
export const cardClass = 'bg-surface rounded-3xl p-6'

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
  `w-full rounded-2xl border-0 m-0 bg-accent px-4 py-3 font-semibold text-on-bright disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

export const buttonSecondaryClass =
  `rounded-2xl border-0 m-0 bg-surface px-4 py-3 font-semibold text-text disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

/** Destructive action (delete, remove): same shape as secondary, danger-colored text. */
export const buttonDangerClass =
  `rounded-2xl border-0 m-0 bg-surface px-4 py-3 font-semibold text-danger disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

/** Large figure (weight, PR, calories): bold, tight, digits that do not jump. */
export const statClass = 'text-3xl font-bold tracking-tight tabular-nums'

/** Quiet label above/next to a figure: visibly a different weight than the value. */
export const labelClass = 'text-sm font-medium text-text-muted'

/**
 * bg-surface-raised statt bg-surface: ein Feld muss sich auch abheben, wenn
 * es (wie ueberall ausser /login) in einer cardClass-Karte liegt — bg-surface
 * waere dort mit der Karte selbst identisch und damit unsichtbar, exakt der
 * Bug, der beim Google-Button auf /login zuerst auffiel.
 */
export const inputClass =
  'w-full rounded-2xl m-0 border border-text-muted/30 bg-surface-raised px-4 py-3 text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

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

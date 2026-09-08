/**
 * Shared Tailwind class recipes for the Phase 6 design system. One string
 * per role, reused everywhere that role appears, so the look changes in one
 * place instead of at every call site. Card and the two button variants
 * carry no state or behaviour, so a wrapper component would add an API
 * surface for nothing — a plain class string is the whole job.
 */
export const cardClass = 'bg-surface rounded-3xl p-6'

/**
 * transition + motion-reduce:transition-none statt eines separaten
 * motion-safe:-Zweigs: der Zustandswechsel selbst (Farbe, Skalierung) soll
 * unter prefers-reduced-motion bestehen bleiben, nur ohne animierten
 * Uebergang dazwischen — siehe Spec, Abschnitt "Motion".
 *
 * Exportiert (nicht nur hier verwendet): Chip und BottomNav brauchen
 * dieselbe Hover/Press/Fokus-Basis, nur mit einer anderen
 * focus-visible:ring-offset-Farbe (die haengt davon ab, auf welchem
 * Hintergrund das Element sitzt) — die traegt jeder Aufrufer selbst bei,
 * statt die ganze Liste ein drittes/viertes Mal zu tippen.
 */
export const interactiveClass =
  'transition duration-150 motion-reduce:transition-none hover:brightness-110 motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export const buttonPrimaryClass =
  `w-full rounded-2xl border-0 m-0 bg-accent px-4 py-3 font-semibold text-on-bright disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

export const buttonSecondaryClass =
  `rounded-2xl border-0 m-0 bg-surface px-4 py-3 font-semibold text-text disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

export const inputClass =
  'w-full rounded-2xl border border-text-muted/30 bg-surface px-4 py-3 text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

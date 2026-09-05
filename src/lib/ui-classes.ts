/**
 * Shared Tailwind class recipes for the Phase 6 design system. One string
 * per role, reused everywhere that role appears, so the look changes in one
 * place instead of at every call site. Card and the two button variants
 * carry no state or behaviour, so a wrapper component would add an API
 * surface for nothing — a plain class string is the whole job.
 */
export const cardClass = 'bg-surface rounded-3xl p-6'

export const buttonPrimaryClass =
  'w-full rounded-2xl border-0 m-0 bg-accent px-4 py-3 font-semibold text-text disabled:opacity-50'

export const buttonSecondaryClass =
  'rounded-2xl border-0 m-0 bg-surface px-4 py-3 font-semibold text-text disabled:opacity-50'

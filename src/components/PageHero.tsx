import type { ReactNode } from 'react'
import { cardClass, heroTitleClass, labelClass } from '../lib/ui-classes'

type Props = {
  label: string
  titel: string
  untertitel?: ReactNode
  /** z. B. ProgressRing links neben dem Titel. */
  aside?: ReactNode
  /** Genau eine Hauptaktion: Pressable variant="primary" oder PressableLink variant="primary". */
  action?: ReactNode
  /** Eingeklappte Zusatzinfo unter dem Kopf, z. B. <details>. */
  details?: ReactNode
  titelClass?: string
  titelTestId?: string
  /** Area the card belongs to: its label takes the area color, so a glance tells where you are. */
  bereich?: keyof typeof BEREICH_TEXT
}

// Area colors as on the charts and in the tab bar; all clear 4.5:1 on the card (contrast.test.ts).
const BEREICH_TEXT = {
  training: 'text-chart-mint',
  ernaehrung: 'text-chart-orange',
  koerper: 'text-chart-koerper',
} as const

export default function PageHero({
  label,
  titel,
  untertitel,
  aside,
  action,
  details,
  titelClass = heroTitleClass,
  titelTestId,
  bereich,
}: Props) {
  return (
    <section className={cardClass} aria-label={label}>
      <div className="flex items-center gap-4">
        {aside}
        <div className="flex min-w-0 flex-col gap-1">
          {/* The area color replaces the muted gray instead of being added to it: two text colors would let CSS order decide. */}
          <h2 className={`font-sans ${bereich ? `text-sm font-semibold ${BEREICH_TEXT[bereich]}` : labelClass}`}>{label}</h2>
          <p className={titelClass} data-testid={titelTestId}>
            {titel}
          </p>
          {untertitel && <div className="text-sm text-text-muted">{untertitel}</div>}
        </div>
      </div>
      {details}
      {action}
    </section>
  )
}

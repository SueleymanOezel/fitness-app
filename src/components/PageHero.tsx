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
}

export default function PageHero({
  label,
  titel,
  untertitel,
  aside,
  action,
  details,
  titelClass = heroTitleClass,
  titelTestId,
}: Props) {
  return (
    <section className={cardClass} aria-label={label}>
      <div className="flex items-center gap-4">
        {aside}
        <div className="flex min-w-0 flex-col gap-1">
          <p className={labelClass}>{label}</p>
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

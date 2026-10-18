import type { WochenTag } from '../lib/streak'
import { tileLabelClass } from '../lib/ui-classes'

/** Reine Anzeige: Mo–So der aktuellen Woche, trainiert in Akzentfarbe, heute mit türkisem Ring. */
export default function WeekStrip({ tage }: { tage: WochenTag[] }) {
  return (
    <ul role="list" aria-label="Trainingstage diese Woche" className="flex gap-1.5">
      {tage.map((tag) => (
        <li
          key={tag.datum}
          data-status={tag.trainiert ? 'trainiert' : 'offen'}
          className="flex flex-1 flex-col items-center gap-1"
        >
          <span className={tileLabelClass}>{tag.label}</span>
          <span
            className={`block h-7 w-full rounded-xl ${tag.trainiert ? 'bg-accent' : 'bg-surface-raised'} ${
              tag.heute ? 'ring-2 ring-chart-mint' : ''
            }`}
          />
          <span className="sr-only">{`${tag.trainiert ? 'trainiert' : 'kein Training'}${tag.heute ? ', heute' : ''}`}</span>
        </li>
      ))}
    </ul>
  )
}

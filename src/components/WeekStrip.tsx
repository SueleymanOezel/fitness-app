import type { WochenTag } from '../lib/streak'
import { tileLabelClass } from '../lib/ui-classes'

/** Reine Anzeige: Mo–So der aktuellen Woche, trainiert in Training-Mint, heute mit hellem Ring. */
export default function WeekStrip({ tage }: { tage: WochenTag[] }) {
  return (
    <div className="flex flex-col gap-2">
      <ul role="list" aria-label="Trainingstage diese Woche" className="flex gap-1.5">
        {tage.map((tag) => (
          <li
            key={tag.datum}
            data-status={tag.trainiert ? 'trainiert' : 'offen'}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <span className={tileLabelClass}>{tag.label}</span>
            <span
              className={`block h-7 w-full rounded-xl ${tag.trainiert ? 'bg-chart-mint' : 'bg-surface-raised'} ${
                tag.heute ? 'ring-2 ring-text ring-offset-2 ring-offset-bg' : ''
              }`}
            />
            <span className="sr-only">{`${tag.trainiert ? 'trainiert' : 'kein Training'}${tag.heute ? ', heute' : ''}`}</span>
          </li>
        ))}
      </ul>
      {/* The colours carry the meaning; say once what they mean (screen readers get it per day). */}
      <p aria-hidden="true" className="flex gap-4 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-chart-mint" />
          trainiert
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-surface-raised ring-2 ring-text" />
          heute
        </span>
      </p>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { kalorienAufschluesselung, type CalorieGoalInput } from '../lib/nutrition-goal'
import { aktivitaetNeuGewaehlt } from '../lib/activity-level-notice'
import { labelClass } from '../lib/ui-classes'
import HilfeKnopf from './HilfeKnopf'

const vorzeichen = (wert: number) => (wert < 0 ? '−' : '+')

/** Folded under the calorie card: how today's goal adds up, training included. */
export default function KalorienAufschluesselung({
  userId,
  profile,
  trainingKcal,
}: {
  userId: string
  profile: CalorieGoalInput & { taegliches_kalorienziel: number | null }
  trainingKcal: number
}) {
  const teile = kalorienAufschluesselung(profile, trainingKcal)
  if (teile == null) return null
  // The level used to include sport; until it is picked again it may count training twice.
  const neuWaehlen = teile.basis.art === 'bedarf' && !aktivitaetNeuGewaehlt(userId)

  return (
    <details>
      <summary className="min-h-11 cursor-pointer py-2.5 font-medium">So entsteht dein Ziel</summary>
      <dl className="flex flex-col gap-2 pb-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt>
            {teile.basis.art === 'bedarf' ? (
              <>
                Tagesbedarf (Alltag)
                <HilfeKnopf begriff="tagesbedarf" />
              </>
            ) : (
              'Dein festes Tagesziel'
            )}
          </dt>
          <dd className="tabular-nums">{teile.basis.kcal} kcal</dd>
        </div>
        {teile.delta !== 0 && (
          <div className="flex justify-between gap-4">
            <dt>
              {teile.delta < 0 ? 'Abnehmen' : 'Zunehmen'}
              <HilfeKnopf begriff="abstandZumBedarf" />
            </dt>
            <dd className="tabular-nums">
              {vorzeichen(teile.delta)}
              {Math.abs(teile.delta)} kcal
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt>
            Training heute
            <HilfeKnopf begriff="trainingsKcal" />
          </dt>
          <dd className="tabular-nums text-chart-mint">+{teile.training} kcal</dd>
        </div>
        <div className="flex justify-between gap-4 font-semibold">
          <dt>Ziel heute</dt>
          <dd className="tabular-nums">{teile.ziel} kcal</dd>
        </div>
        <p className={labelClass}>Sport zählt extra: Was du heute trainierst, kommt aufs Ziel und darf gegessen werden.</p>
        {neuWaehlen && (
          <p className="text-sm">
            Dein Aktivitätslevel meint jetzt nur den Alltag ohne Sport.{' '}
            {/* Inline in the sentence: linkClass would make it a 44 px row and split the line. */}
            <Link to="/profile" className="text-accent-text underline underline-offset-2">

              Im Profil neu wählen
            </Link>
          </p>
        )}
      </dl>
    </details>
  )
}

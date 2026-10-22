import { kalorienAufschluesselung, type CalorieGoalInput } from '../lib/nutrition-goal'
import { labelClass } from '../lib/ui-classes'

const vorzeichen = (wert: number) => (wert < 0 ? '−' : '+')

/** Folded under the calorie card: where the goal comes from, and what training burned today. */
export default function KalorienAufschluesselung({
  profile,
  trainingKcal,
}: {
  profile: CalorieGoalInput & { taegliches_kalorienziel: number | null }
  trainingKcal: number
}) {
  const teile = kalorienAufschluesselung(profile)
  if (teile == null && trainingKcal <= 0) return null

  return (
    <details>
      <summary className="min-h-11 cursor-pointer py-2.5 font-medium">So entsteht dein Ziel</summary>
      <dl className="flex flex-col gap-2 pb-2 text-sm">
        {teile && (
          <>
            <div className="flex justify-between gap-4">
              <dt>Tagesbedarf</dt>
              <dd className="tabular-nums">{teile.tagesbedarf} kcal</dd>
            </div>
            {teile.delta !== 0 && (
              <div className="flex justify-between gap-4">
                <dt>{teile.delta < 0 ? 'Abnehmen' : 'Zunehmen'}</dt>
                <dd className="tabular-nums">
                  {vorzeichen(teile.delta)}
                  {Math.abs(teile.delta)} kcal
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4 font-semibold">
              <dt>Ziel</dt>
              <dd className="tabular-nums">{teile.ziel} kcal</dd>
            </div>
            <p className={labelClass}>Der Tagesbedarf enthält Alltag und Training im Schnitt.</p>
          </>
        )}
        {trainingKcal > 0 && (
          <div className="flex justify-between gap-4">
            <dt>Heute beim Training verbraucht</dt>
            <dd className="tabular-nums">{trainingKcal} kcal</dd>
          </div>
        )}
      </dl>
    </details>
  )
}

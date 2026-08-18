import { useState } from 'react'
import type { Profile } from '../hooks/use-profile'
import { calculateCalorieGoal } from '../lib/nutrition-goal'

type Props = {
  profile: Profile
  onUpdate: (patch: Partial<Profile>) => Promise<void>
}

export default function CalorieGoalEditor({ profile, onUpdate }: Props) {
  const [mode, setMode] = useState<'manual' | 'calculated'>(
    profile.taegliches_kalorienziel != null ? 'manual' : 'calculated',
  )

  const calculated = calculateCalorieGoal(profile)

  function switchToManual() {
    setMode('manual')
  }

  async function switchToCalculated() {
    setMode('calculated')
    await onUpdate({ taegliches_kalorienziel: null })
  }

  async function handleManualChange(value: string) {
    const parsed = value === '' ? null : Number(value)
    await onUpdate({ taegliches_kalorienziel: parsed })
  }

  if (mode === 'calculated') {
    return (
      <div>
        <p>
          {calculated != null
            ? `Berechnetes Tagesziel: ${calculated} kcal`
            : 'Profil vervollständigen (Gewicht, Größe, Alter, Geschlecht, Aktivitätslevel), um ein Ziel zu berechnen.'}
        </p>
        <button type="button" onClick={switchToManual}>
          Manuell festlegen
        </button>
      </div>
    )
  }

  return (
    <div>
      <label>
        Tagesziel (kcal)
        <input
          type="number"
          value={profile.taegliches_kalorienziel ?? ''}
          onChange={(event) => handleManualChange(event.target.value)}
        />
      </label>
      <button type="button" onClick={switchToCalculated}>
        Berechnen lassen
      </button>
    </div>
  )
}

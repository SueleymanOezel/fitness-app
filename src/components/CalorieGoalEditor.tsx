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
  // Draft, not the persisted value: saving per keystroke fires racing updates
  // ("2500" → 2, 25, 250, 2500) whose responses can land out of order.
  const [draft, setDraft] = useState(String(profile.taegliches_kalorienziel ?? ''))

  const calculated = calculateCalorieGoal(profile)

  function switchToManual() {
    setMode('manual')
  }

  async function switchToCalculated() {
    setMode('calculated')
    setDraft('')
    await onUpdate({ taegliches_kalorienziel: null })
  }

  async function commitManual() {
    const value = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setDraft(String(profile.taegliches_kalorienziel ?? ''))
      return
    }
    if (value !== profile.taegliches_kalorienziel) await onUpdate({ taegliches_kalorienziel: value })
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
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitManual}
        />
      </label>
      <button type="button" onClick={switchToCalculated}>
        Berechnen lassen
      </button>
    </div>
  )
}

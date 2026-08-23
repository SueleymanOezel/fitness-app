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
  const [failed, setFailed] = useState(false)

  const calculated = calculateCalorieGoal(profile)

  function switchToManual() {
    setMode('manual')
  }

  async function switchToCalculated() {
    setMode('calculated')
    setDraft('')
    setFailed(false)
    try {
      await onUpdate({ taegliches_kalorienziel: null })
    } catch {
      setFailed(true)
    }
  }

  async function commitManual() {
    setFailed(false)
    const value = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setDraft(String(profile.taegliches_kalorienziel ?? ''))
      return
    }
    if (value === profile.taegliches_kalorienziel) return

    // A rejected write must not leave the typed value on screen as if it were stored.
    try {
      await onUpdate({ taegliches_kalorienziel: value })
    } catch {
      setDraft(String(profile.taegliches_kalorienziel ?? ''))
      setFailed(true)
    }
  }

  if (mode === 'calculated') {
    return (
      <div>
        <p>
          {calculated != null
            ? `Berechnetes Tagesziel: ${calculated} kcal`
            : 'Profil vervollständigen (Gewicht, Größe, Alter, Geschlecht, Aktivitätslevel), um ein Ziel zu berechnen.'}
        </p>
        {failed && <p role="alert">Ziel konnte nicht gespeichert werden.</p>}
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
          step="any"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitManual}
        />
      </label>
      {failed && <p role="alert">Ziel konnte nicht gespeichert werden.</p>}
      <button type="button" onClick={switchToCalculated}>
        Berechnen lassen
      </button>
    </div>
  )
}

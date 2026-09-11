import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlans } from '../hooks/use-workout-plans'
import { buttonPrimaryClass, buttonSecondaryClass, inputClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import Chip from '../components/Chip'

const HAEUFIGKEITEN = [1, 2, 3, 4, 5, 6, 7]
const STANDARD_DAUER_WOCHEN = 4

export default function TrainingPlanWizardPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Neuer Plan</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Wizard userId={userId} />
}

function Wizard({ userId }: { userId: string }) {
  const { createPlan } = useWorkoutPlans(userId)
  const navigate = useNavigate()
  const showToast = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [haeufigkeit, setHaeufigkeit] = useState<number | null>(null)
  const [dauer, setDauer] = useState(STANDARD_DAUER_WOCHEN)
  const [dauerError, setDauerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function weiterVonName() {
    if (name.trim() === '') {
      setNameError('Der Plan braucht einen Namen.')
      return
    }
    setNameError('')
    setStep(2)
  }

  async function planErstellen() {
    if (submitting) return
    if (haeufigkeit === null) return
    if (!Number.isInteger(dauer) || dauer < 1) {
      setDauerError('Die Plandauer muss mindestens 1 Woche sein.')
      return
    }
    setDauerError('')
    setSubmitting(true)
    try {
      const id = await createPlan(name.trim(), haeufigkeit, dauer)
      navigate(`/training/plans/${id}`)
    } catch {
      showToast('Plan konnte nicht erstellt werden.', 'error')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1>Neuer Plan</h1>
      {step === 1 && (
        <>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </label>
          {nameError !== '' && <p role="alert">{nameError}</p>}
          <button type="button" className={buttonPrimaryClass} onClick={weiterVonName}>
            Weiter
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <h2>Wie oft möchtest du trainieren?</h2>
          <div className="flex flex-wrap gap-2">
            {HAEUFIGKEITEN.map((wert) => (
              <Chip key={wert} active={haeufigkeit === wert} onClick={() => setHaeufigkeit(wert)}>
                {wert}× pro Woche
              </Chip>
            ))}
          </div>
          <button type="button" className={buttonSecondaryClass} onClick={() => setStep(1)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="back" tone="mono" size={20} />
              Zurück
            </span>
          </button>
          <button
            type="button"
            className={buttonPrimaryClass}
            disabled={haeufigkeit === null}
            onClick={() => setStep(3)}
          >
            Weiter
          </button>
        </>
      )}
      {step === 3 && (
        <>
          <h2>Plandauer</h2>
          <label>
            Wochen
            <input
              type="number"
              min={1}
              value={dauer}
              onChange={(event) => setDauer(Number(event.target.value))}
              className={inputClass}
            />
          </label>
          {dauerError !== '' && <p role="alert">{dauerError}</p>}
          <button type="button" className={buttonSecondaryClass} onClick={() => setStep(2)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="back" tone="mono" size={20} />
              Zurück
            </span>
          </button>
          <button type="button" className={buttonPrimaryClass} disabled={submitting} onClick={planErstellen}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="add" tone="mono" size={20} />
              Plan erstellen
            </span>
          </button>
        </>
      )}
      <Link to="/training/plans" className="flex items-center justify-center gap-2">
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zu meinen Plänen
      </Link>
    </div>
  )
}

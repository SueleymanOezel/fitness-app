import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlans } from '../hooks/use-workout-plans'
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'

export default function TrainingPlansPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Meine Pläne</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <PlansList userId={userId} />
}

function PlansList({ userId }: { userId: string }) {
  const { plans, loading, createPlan, deletePlan, activatePlan } = useWorkoutPlans(userId)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const showToast = useToast()

  if (loading) {
    return (
      <div>
        <h1>Meine Pläne</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  // The hooks reject on a failed write; without this the rejection would go
  // unhandled and the user would see nothing at all. A write failure is
  // short-lived feedback on an action, so it goes to a toast — unlike the
  // name-is-empty check below, which is permanent form validation and stays
  // inline (ToastProvider's own contract: transient action feedback only).
  async function run(action: () => Promise<void>, message: string) {
    try {
      await action()
    } catch {
      showToast(message, 'error')
    }
  }

  return (
    <div>
      <h1>Meine Pläne</h1>
      <ul role="list" className="space-y-4">
        {plans.map((plan) => (
          <li key={plan.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              <Link to={`/training/plans/${plan.id}`}>{plan.name}</Link>
              {plan.aktiv && <span>aktiv</span>}
              {!plan.aktiv && (
                <button
                  type="button"
                  className={buttonSecondaryClass}
                  onClick={() => run(() => activatePlan(plan.id), 'Aktivieren fehlgeschlagen.')}
                >
                  Aktivieren
                </button>
              )}
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => run(() => deletePlan(plan.id), 'Löschen fehlgeschlagen.')}
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (name.trim() === '') {
            setNameError('Der Plan braucht einen Namen.')
            return
          }
          setNameError('')
          const trimmed = name.trim()
          setName('')
          await run(() => createPlan(trimmed), 'Anlegen fehlgeschlagen.')
        }}
      >
        <label>
          Neuer Plan
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" className={buttonPrimaryClass}>
          Anlegen
        </button>
      </form>
      {nameError !== '' && <p role="alert">{nameError}</p>}
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlans } from '../hooks/use-workout-plans'

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
  const [error, setError] = useState('')

  if (loading) {
    return (
      <div>
        <h1>Meine Pläne</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  // The hooks reject on a failed write; without this the rejection would go
  // unhandled and the user would see nothing at all.
  async function run(action: () => Promise<void>, message: string) {
    setError('')
    try {
      await action()
    } catch {
      setError(message)
    }
  }

  return (
    <div>
      <h1>Meine Pläne</h1>
      <ul>
        {plans.map((plan) => (
          <li key={plan.id}>
            <Link to={`/training/plans/${plan.id}`}>{plan.name}</Link>
            {plan.aktiv && <span>aktiv</span>}
            {!plan.aktiv && (
              <button type="button" onClick={() => run(() => activatePlan(plan.id), 'Aktivieren fehlgeschlagen.')}>
                Aktivieren
              </button>
            )}
            <button type="button" onClick={() => run(() => deletePlan(plan.id), 'Löschen fehlgeschlagen.')}>
              Löschen
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (name.trim() === '') {
            setError('Der Plan braucht einen Namen.')
            return
          }
          const trimmed = name.trim()
          setName('')
          await run(() => createPlan(trimmed), 'Anlegen fehlgeschlagen.')
        }}
      >
        <label>
          Neuer Plan
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit">Anlegen</button>
      </form>
      {error !== '' && <p role="alert">{error}</p>}
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}

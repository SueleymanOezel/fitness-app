import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlans } from '../hooks/use-workout-plans'
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'

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
  const { plans, loading, deletePlan, activatePlan } = useWorkoutPlans(userId)
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
  // short-lived feedback on an action, so it goes to a toast.
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
                <span className="inline-flex items-center justify-center gap-2">
                  <VitaIcon name="delete" tone="mono" size={20} />
                  Löschen
                </span>
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Link to="/training/plans/new" className={buttonPrimaryClass}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="add" tone="mono" size={20} />
          Neuer Plan
        </span>
      </Link>
      <Link to="/training" className="flex items-center justify-center gap-2">
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zum Training
      </Link>
    </div>
  )
}

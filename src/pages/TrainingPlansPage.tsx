import { useSession } from '../hooks/use-session'
import { useWorkoutPlans } from '../hooks/use-workout-plans'
import { cardClass, linkClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import Pressable, { PressableLink } from '../components/Pressable'

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
      <ul role="list" className="flex flex-col gap-3">
        {plans.map((plan) => (
          <li key={plan.id}>
            <div className={`${cardClass} w-full`}>
              <PressableLink to={`/training/plans/${plan.id}`} className={linkClass}>
                {plan.name}
              </PressableLink>
              {plan.aktiv && <span>aktiv</span>}
              {!plan.aktiv && (
                <Pressable
                  variant="secondary"
                  type="button"
                  onClick={() => run(() => activatePlan(plan.id), 'Aktivieren fehlgeschlagen.')}
                >
                  Aktivieren
                </Pressable>
              )}
              <Pressable
                variant="danger"
                type="button"
                onClick={() => run(() => deletePlan(plan.id), 'Löschen fehlgeschlagen.')}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <VitaIcon name="delete" tone="mono" size={20} />
                  Löschen
                </span>
              </Pressable>
            </div>
          </li>
        ))}
      </ul>
      <PressableLink variant="primary" to="/training/plans/new">
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="add" tone="mono" size={20} />
          Neuer Plan
        </span>
      </PressableLink>
      <PressableLink to="/training" className={linkClass}>
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zum Training
      </PressableLink>
    </div>
  )
}

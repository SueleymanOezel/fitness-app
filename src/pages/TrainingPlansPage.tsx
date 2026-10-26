import { useSession } from '../hooks/use-session'
import { useWorkoutPlans } from '../hooks/use-workout-plans'
import { cardClass, listClass, rowLinkClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import Pressable, { PressableLink } from '../components/Pressable'
import EmptyState from '../components/EmptyState'
import LoadError from '../components/LoadError'
import PageSkeleton from '../components/PageSkeleton'

export default function TrainingPlansPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Meine Pläne" variante="liste" />

  return <PlansList userId={userId} />
}

function PlansList({ userId }: { userId: string }) {
  const { plans, loading, error, reload, activatePlan } = useWorkoutPlans(userId)
  const showToast = useToast()

  if (loading) return <PageSkeleton titel="Meine Pläne" variante="liste" />
  if (error) return <LoadError titel="Meine Pläne" text="Pläne konnten nicht geladen werden." onRetry={reload} />

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
      {plans.length === 0 ? (
        <EmptyState titel="Noch kein Plan." text="Lege deinen ersten Trainingsplan an." />
      ) : (
        <div className={cardClass}>
          <ul role="list" className={listClass}>
            {plans.map((plan) => (
              <li key={plan.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <PressableLink to={`/training/plans/${plan.id}`} className={rowLinkClass}>
                    {plan.name}
                    <span aria-hidden="true" className="text-text-muted">
                      ›
                    </span>
                  </PressableLink>
                  {/* A status, not a button: a dot in the training color instead of a pill like "Aktivieren". */}
                  {plan.aktiv && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-chart-mint">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-chart-mint" />
                      Aktiv
                    </span>
                  )}
                </div>
                {!plan.aktiv && (
                  <Pressable
                    variant="secondary"
                    type="button"
                    className="self-start"
                    aria-label={`${plan.name} aktivieren`}
                    onClick={() => run(() => activatePlan(plan.id), 'Aktivieren fehlgeschlagen.')}
                  >
                    Aktivieren
                  </Pressable>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <PressableLink variant="primary" to="/training/plans/new">
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="add" tone="mono" size={20} />
          Neuer Plan
        </span>
      </PressableLink>
    </div>
  )
}

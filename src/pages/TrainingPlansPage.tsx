import { useSession } from '../hooks/use-session'
import { useWorkoutPlans } from '../hooks/use-workout-plans'
import { cardClass, linkClass, listClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import Pressable, { PressableLink } from '../components/Pressable'
import EmptyState from '../components/EmptyState'
import ConfirmDelete from '../components/ConfirmDelete'
import LoadError from '../components/LoadError'
import PageSkeleton from '../components/PageSkeleton'

export default function TrainingPlansPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Meine Pläne" variante="liste" />

  return <PlansList userId={userId} />
}

function PlansList({ userId }: { userId: string }) {
  const { plans, loading, error, reload, deletePlan, activatePlan } = useWorkoutPlans(userId)
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
                  <PressableLink to={`/training/plans/${plan.id}`} className={linkClass}>
                    {plan.name}
                    <span aria-hidden="true" className="text-text-muted">
                      ›
                    </span>
                  </PressableLink>
                  {plan.aktiv && (
                    <span className="rounded-full bg-surface-raised px-3 py-1 text-sm font-medium text-text">aktiv</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!plan.aktiv && (
                    <Pressable
                      variant="secondary"
                      type="button"
                      onClick={() => run(() => activatePlan(plan.id), 'Aktivieren fehlgeschlagen.')}
                    >
                      Aktivieren
                    </Pressable>
                  )}
                  <ConfirmDelete
                    label="Löschen"
                    ariaLabel={`${plan.name} löschen`}
                    ruhig
                    titel="Plan löschen?"
                    text={`„${plan.name}“ mit allen Tagen und Übungen wird gelöscht. Deine bisherigen Trainings bleiben erhalten.`}
                    onConfirm={() => deletePlan(plan.id)}
                  />
                </div>
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

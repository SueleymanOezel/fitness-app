import { useSession } from '../hooks/use-session'
import { useWorkoutHistory } from '../hooks/use-workout-history'
import { cardClass, linkClass, listClass, listRowClass } from '../lib/ui-classes'
import { VitaIcon } from '../components/icons/VitaIcon'
import { PressableLink } from '../components/Pressable'
import EmptyState from '../components/EmptyState'
import LoadError from '../components/LoadError'
import PageSkeleton from '../components/PageSkeleton'

export default function TrainingHistoryPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Trainingshistorie" variante="liste" />

  return <HistoryList userId={userId} />
}

function HistoryList({ userId }: { userId: string }) {
  const { sessions, loading, error, reload } = useWorkoutHistory(userId)

  if (loading) return <PageSkeleton titel="Trainingshistorie" variante="liste" />
  if (error) {
    return <LoadError titel="Trainingshistorie" text="Trainings konnten nicht geladen werden." onRetry={reload} />
  }

  return (
    <div>
      <h1>Trainingshistorie</h1>
      {sessions.length === 0 ? (
        <EmptyState
          titel="Noch keine Trainings aufgezeichnet."
          text="Nach deinem ersten Training erscheint es hier."
          action={
            <PressableLink variant="primary" to="/training">
              Zum Training
            </PressableLink>
          }
        />
      ) : (
        <div className={cardClass}>
          <ul role="list" className={listClass}>
            {sessions.map((entry) => (
              <li key={entry.id} className={listRowClass}>
                <PressableLink to={`/training/history/${entry.id}`} className={`${linkClass} flex-1`}>
                  <span className="flex min-w-0 flex-col">
                    <span>{`${entry.plan_name ?? '—'} – ${entry.tag_name ?? '—'}`}</span>
                    <span className="text-sm text-text-muted">
                      {`${new Date(entry.gestartet_am).toLocaleDateString('de-DE')} · ${
                        // An unfinished session has no calorie result; "0 kcal" would read as a measurement.
                        entry.gesamt_kalorien == null ? 'nicht beendet' : `${Math.round(entry.gesamt_kalorien)} kcal`
                      }`}
                    </span>
                  </span>
                </PressableLink>
              </li>
            ))}
          </ul>
        </div>
      )}
      <PressableLink to="/training" className={linkClass}>
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zum Training
      </PressableLink>
    </div>
  )
}

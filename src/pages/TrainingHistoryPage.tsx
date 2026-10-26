import { useSession } from '../hooks/use-session'
import { useWorkoutHistory } from '../hooks/use-workout-history'
import { cardClass, listClass, listRowClass, rowLinkClass } from '../lib/ui-classes'
import { PressableLink } from '../components/Pressable'
import EmptyState from '../components/EmptyState'
import LoadError from '../components/LoadError'
import PageSkeleton from '../components/PageSkeleton'

export default function TrainingHistoryPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Verlauf" variante="liste" />

  return <HistoryList userId={userId} />
}

function HistoryList({ userId }: { userId: string }) {
  const { sessions, loading, error, reload } = useWorkoutHistory(userId)

  if (loading) return <PageSkeleton titel="Verlauf" variante="liste" />
  if (error) {
    return <LoadError titel="Verlauf" text="Trainings konnten nicht geladen werden." onRetry={reload} />
  }

  return (
    <div>
      <h1>Verlauf</h1>
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
                <PressableLink to={`/training/history/${entry.id}`} className={`${rowLinkClass} flex-1`}>
                  <span className="flex min-w-0 flex-col">
                    <span>{entry.tag_name ?? entry.plan_name ?? 'Training'}</span>
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
    </div>
  )
}

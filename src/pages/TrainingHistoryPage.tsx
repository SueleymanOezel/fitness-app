import { useSession } from '../hooks/use-session'
import { useWorkoutHistory } from '../hooks/use-workout-history'
import { cardClass, linkClass } from '../lib/ui-classes'
import { VitaIcon } from '../components/icons/VitaIcon'
import { PressableLink } from '../components/Pressable'

export default function TrainingHistoryPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Trainingshistorie</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <HistoryList userId={userId} />
}

function HistoryList({ userId }: { userId: string }) {
  const { sessions, loading } = useWorkoutHistory(userId)

  if (loading) {
    return (
      <div>
        <h1>Trainingshistorie</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Trainingshistorie</h1>
      {sessions.length === 0 ? (
        <p>Noch keine Trainings aufgezeichnet.</p>
      ) : (
        <ul role="list" className="flex flex-col gap-3">
          {sessions.map((entry) => (
            <li key={entry.id}>
              <div className={`${cardClass} w-full`}>
                <PressableLink to={`/training/history/${entry.id}`} className={linkClass}>
                  {`${entry.plan_name ?? '—'} – ${entry.tag_name ?? '—'} – ${new Date(
                    entry.gestartet_am,
                  ).toLocaleDateString('de-DE')} – ${
                    // An unfinished session has no calorie result; "0 kcal" would read as a measurement.
                    entry.gesamt_kalorien == null ? 'nicht beendet' : `${Math.round(entry.gesamt_kalorien)} kcal`
                  }`}
                </PressableLink>
              </div>
            </li>
          ))}
        </ul>
      )}
      <PressableLink to="/training" className={linkClass}>
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zum Training
      </PressableLink>
    </div>
  )
}

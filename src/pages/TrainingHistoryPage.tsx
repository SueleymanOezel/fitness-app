import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutHistory } from '../hooks/use-workout-history'

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
        <ul role="list">
          {sessions.map((entry) => (
            <li key={entry.id}>
              <Link to={`/training/history/${entry.id}`}>
                {`${entry.plan_name ?? '—'} – ${entry.tag_name ?? '—'} – ${new Date(
                  entry.gestartet_am,
                ).toLocaleDateString('de-DE')} – ${
                  // An unfinished session has no calorie result; "0 kcal" would read as a measurement.
                  entry.gesamt_kalorien == null ? 'nicht beendet' : `${Math.round(entry.gesamt_kalorien)} kcal`
                }`}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}

import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { startWorkoutSession } from '../hooks/use-workout-session'
import { useChartSelection } from '../components/charts/ChartPicker'
import { useTrainingAnalysis } from '../hooks/use-training-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'

// Lazy at this use site too, not just on the analysis page: TrainingFrequencyChart
// pulls in recharts (~136 kB gzipped), and this dashboard is reachable from
// the entry route graph. Without this, recharts would still end up in the
// entry chunk regardless of the analysis page's own lazy import.
const TrainingFrequencyChart = lazy(() => import('../components/charts/TrainingFrequencyChart'))

export default function TrainingPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { plan, day, loading } = useActiveTrainingDay(userId)
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const auswahl = useChartSelection(userId)

  if (loading) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  // Disabled while starting: a second click would create a second session
  // and leave the first one open forever.
  async function start(dayId: string) {
    setError('')
    setStarting(true)
    try {
      const sessionId = await startWorkoutSession(userId, dayId)
      navigate(`/training/session/${sessionId}`)
    } catch {
      setError('Training konnte nicht gestartet werden.')
      setStarting(false)
    }
  }

  return (
    <div>
      <h1>Training</h1>
      {plan == null && <p>Kein aktiver Plan.</p>}
      {plan != null && day == null && (
        <>
          <p>{plan.name}</p>
          <p>Dieser Plan hat noch keinen Tag.</p>
        </>
      )}
      {plan != null && day != null && (
        <>
          <p>{plan.name}</p>
          <p>{day.name}</p>
          <button type="button" disabled={starting} onClick={() => start(day.id)}>
            Training starten
          </button>
        </>
      )}
      {error !== '' && <p role="alert">{error}</p>}
      <Link to="/training/plans">Meine Pläne</Link>
      <Link to="/training/exercises">Übungen</Link>
      <Link to="/training/history">Trainingshistorie</Link>
      {auswahl.istGewaehlt('T1') && <DashboardTrainingFrequency userId={userId} />}
      <Link to="/training/analyse">Analyse</Link>
    </div>
  )
}

function DashboardTrainingFrequency({ userId }: { userId: string }) {
  const { sessions, loading, error } = useTrainingAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return (
    <Suspense fallback={<p>Lädt…</p>}>
      <TrainingFrequencyChart sessions={sessions} />
    </Suspense>
  )
}

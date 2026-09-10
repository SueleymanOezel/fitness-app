import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { startWorkoutSession } from '../hooks/use-workout-session'
import { useChartSelection } from '../components/charts/ChartPicker'
import { useTrainingAnalysis } from '../hooks/use-training-analysis'
import TrainingChartList from '../components/charts/TrainingChartList'
import { chartsFor } from '../lib/analysis/registry'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { buttonPrimaryClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'

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
  const showToast = useToast()
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
    setStarting(true)
    try {
      const sessionId = await startWorkoutSession(userId, dayId)
      navigate(`/training/session/${sessionId}`)
    } catch {
      showToast('Training konnte nicht gestartet werden.', 'error')
      setStarting(false)
    }
  }

  return (
    <div>
      <h1>Training</h1>
      {plan == null && (
        <>
          <p>Kein aktiver Plan.</p>
          <Link to="/training/plans" className={buttonPrimaryClass}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="plans" tone="mono" size={20} />
              Trainingsplan anlegen
            </span>
          </Link>
        </>
      )}
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
          <button type="button" className={buttonPrimaryClass} disabled={starting} onClick={() => start(day.id)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="start" tone="mono" size={20} />
              Training starten
            </span>
          </button>
        </>
      )}
      <Link to="/training/plans" className="flex items-center justify-center gap-2">
        <VitaIcon name="plans" tone="brand" size={20} />
        Meine Pläne
      </Link>
      <Link to="/training/exercises" className="flex items-center justify-center gap-2">
        <VitaIcon name="exercises" tone="brand" size={20} />
        Übungen
      </Link>
      <Link to="/training/history" className="flex items-center justify-center gap-2">
        <VitaIcon name="history" tone="brand" size={20} />
        Trainingshistorie
      </Link>
      <DashboardTrainingCharts userId={userId} auswahl={auswahl.auswahl} />
      <Link to="/training/analyse" className="flex items-center justify-center gap-2">
        <VitaIcon name="analysis" tone="brand" size={20} />
        Analyse
      </Link>
    </div>
  )
}

/**
 * Rendert die angehakten Trainingsgraphen — und faellt vorher komplett aus,
 * wenn keiner angehakt ist: der Hook steckt in der Kindkomponente, ein leeres
 * Dashboard soll keine Abfrage ausloesen.
 */
function DashboardTrainingCharts({ userId, auswahl }: { userId: string; auswahl: string[] }) {
  const bereichsIds = new Set(chartsFor('training').map((chart) => chart.id))
  const ids = auswahl.filter((id) => bereichsIds.has(id))
  if (ids.length === 0) return null
  return <DashboardTrainingChartsData userId={userId} ids={ids} />
}

function DashboardTrainingChartsData({ userId, ids }: { userId: string; ids: string[] }) {
  const { sessions, sets, loading, error } = useTrainingAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return (
    <TrainingChartList
      ids={ids}
      sessions={sessions}
      sets={sets}
    />
  )
}

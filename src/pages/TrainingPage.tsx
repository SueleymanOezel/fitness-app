import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { startWorkoutSession } from '../hooks/use-workout-session'
import { useChartSelection } from '../components/charts/ChartPicker'
import { useTrainingAnalysis } from '../hooks/use-training-analysis'
import TrainingChartList from '../components/charts/TrainingChartList'
import { chartsFor } from '../lib/analysis/registry'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import { wochenAktiv } from '../lib/plan-alter'
import Pressable, { PressableLink } from '../components/Pressable'

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

  const wochenAktivSeit = plan != null ? wochenAktiv(plan.created_at, new Date()) : 0

  return (
    <div>
      <h1>Training</h1>
      {plan == null && (
        <>
          <p>Kein aktiver Plan.</p>
          <PressableLink variant="primary" to="/training/plans">
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="plans" tone="mono" size={20} />
              Trainingsplan anlegen
            </span>
          </PressableLink>
        </>
      )}
      {plan != null && plan.dauer_wochen != null && wochenAktivSeit >= plan.dauer_wochen && (
        <p>
          Dieser Plan läuft seit {wochenAktivSeit} {wochenAktivSeit === 1 ? 'Woche' : 'Wochen'} —{' '}
          <PressableLink to="/training/plans/new">Zeit für einen neuen?</PressableLink>
        </p>
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
          <Pressable variant="primary" type="button" disabled={starting} onClick={() => start(day.id)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="start" tone="mono" size={20} />
              Training starten
            </span>
          </Pressable>
        </>
      )}
      <PressableLink to="/training/plans" className="flex items-center justify-center gap-2">
        <VitaIcon name="plans" tone="brand" size={20} />
        Meine Pläne
      </PressableLink>
      <PressableLink to="/training/exercises" className="flex items-center justify-center gap-2">
        <VitaIcon name="exercises" tone="brand" size={20} />
        Übungen
      </PressableLink>
      <PressableLink to="/training/history" className="flex items-center justify-center gap-2">
        <VitaIcon name="history" tone="brand" size={20} />
        Trainingshistorie
      </PressableLink>
      <DashboardTrainingCharts userId={userId} auswahl={auswahl.auswahl} />
      <PressableLink to="/training/analyse" className="flex items-center justify-center gap-2">
        <VitaIcon name="analysis" tone="brand" size={20} />
        Analyse
      </PressableLink>
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

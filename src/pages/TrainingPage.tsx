import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { startWorkoutSession, useOffeneSession } from '../hooks/use-workout-session'
import { useTrainingStreak } from '../hooks/use-training-streak'
import { useChartSelection } from '../components/charts/ChartPicker'
import { useTrainingAnalysis } from '../hooks/use-training-analysis'
import TrainingChartList from '../components/charts/TrainingChartList'
import { chartsFor } from '../lib/analysis/registry'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import { wochenAktiv } from '../lib/plan-alter'
import { wochenStreifen } from '../lib/streak'
import { localDay } from '../lib/local-time'
import Pressable, { PressableLink } from '../components/Pressable'
import PageHero from '../components/PageHero'
import OpenSessionHero from '../components/OpenSessionHero'
import WeekStrip from '../components/WeekStrip'
import LinkListCard from '../components/LinkListCard'
import EmptyState from '../components/EmptyState'
import LoadError from '../components/LoadError'
import PageSkeleton, { ChartSkeleton } from '../components/PageSkeleton'
import Skeleton from '../components/Skeleton'

export default function TrainingPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Training" />

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { plan, day, loading, error, reload } = useActiveTrainingDay(userId)
  const { tage, loading: streakLoading } = useTrainingStreak(userId)
  const offen = useOffeneSession(userId)
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const showToast = useToast()
  const auswahl = useChartSelection(userId)

  if (loading) return <PageSkeleton titel="Training" />
  if (error) return <LoadError titel="Training" text="Training konnte nicht geladen werden." onRetry={reload} />

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
      {plan != null && plan.dauer_wochen != null && wochenAktivSeit >= plan.dauer_wochen && (
        <p>
          Dieser Plan läuft seit {wochenAktivSeit} {wochenAktivSeit === 1 ? 'Woche' : 'Wochen'} —{' '}
          <PressableLink to="/training/plans/new">Zeit für einen neuen?</PressableLink>
        </p>
      )}
      {streakLoading ? (
        <div role="status">
          <span className="sr-only">Lädt…</span>
          <Skeleton className="h-14" />
        </div>
      ) : (
        <WeekStrip tage={wochenStreifen(tage, localDay(new Date().toISOString()))} />
      )}
      {plan == null && (
        <EmptyState
          titel="Kein aktiver Plan."
          text="Lege einen Plan an, dann siehst du hier, was heute ansteht."
          action={
            <PressableLink variant="primary" to="/training/plans">
              <span className="inline-flex items-center justify-center gap-2">
                <VitaIcon name="plans" tone="mono" size={20} />
                Trainingsplan anlegen
              </span>
            </PressableLink>
          }
        />
      )}
      {plan != null && day == null && (
        <EmptyState
          titel={plan.name}
          text="Dieser Plan hat noch keinen Tag."
          action={
            <PressableLink variant="primary" to={`/training/plans/${plan.id}`}>
              Plan bearbeiten
            </PressableLink>
          }
        />
      )}
      {offen !== null && <OpenSessionHero offen={offen} />}
      {offen === null && plan != null && day != null && (
        <PageHero
          label={`Heute · ${plan.name}`}
          bereich="training"
          titel={day.name}
          action={
            <Pressable variant="primary" type="button" disabled={starting} onClick={() => start(day.id)}>
              <span className="inline-flex items-center justify-center gap-2">
                <VitaIcon name="start" tone="mono" size={20} />
                Training starten
              </span>
            </Pressable>
          }
        />
      )}
      <LinkListCard
        items={[
          { to: '/training/plans', label: 'Meine Pläne', icon: 'plans' },
          { to: '/training/exercises', label: 'Übungen', icon: 'exercises' },
          { to: '/training/history', label: 'Verlauf', icon: 'history' },
          { to: '/training/analyse', label: 'Analyse', icon: 'analysis' },
        ]}
      />
      <DashboardTrainingCharts userId={userId} auswahl={auswahl.auswahl} />
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
  if (loading) return <ChartSkeleton />
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return (
    <TrainingChartList
      ids={ids}
      sessions={sessions}
      sets={sets}
    />
  )
}

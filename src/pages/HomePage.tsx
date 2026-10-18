import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import { sumKalorien } from '../lib/entry-calories'
import { kalorienStatus } from '../lib/calorie-status'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { useBodyMetrics } from '../hooks/use-body-metrics'
import { changeSince, latestValue } from '../lib/body-change'
import { useChartSelection } from '../components/charts/ChartPicker'
import HomeChartList from '../components/charts/HomeChartList'
import { chartsFor } from '../lib/analysis/registry'
import { useHomeAnalysis } from '../hooks/use-home-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { useTrainingStreak } from '../hooks/use-training-streak'
import { streakText } from '../lib/streak'
import { PressableLink } from '../components/Pressable'
import PageHero from '../components/PageHero'
import ProgressRing from '../components/ProgressRing'
import StatStrip, { type StatTile } from '../components/StatStrip'
import LinkListCard from '../components/LinkListCard'
import EmptyState from '../components/EmptyState'
import PageSkeleton, { ChartSkeleton } from '../components/PageSkeleton'

/** German notation: comma as the decimal mark, at most one place. */
function formatValue(value: number) {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

export default function HomePage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Home" />

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading } = useProfile(userId)
  const { entries, loading: entriesLoading } = useFoodEntries(userId)
  const { plan, day, loading: trainingLoading, error: trainingError } = useActiveTrainingDay(userId)
  const { rows, loading: rowsLoading, error: rowsError } = useBodyMetrics(userId)
  const { streak, loading: streakLoading } = useTrainingStreak(userId)
  const auswahl = useChartSelection(userId)

  if (profileLoading || entriesLoading || trainingLoading || rowsLoading || streakLoading) {
    return <PageSkeleton titel="Home" />
  }

  // goal bleibt null, wenn das Profil nicht geladen werden konnte — die Kalorien-Karte
  // zeigt das Gegessene dann trotzdem, nur ohne Restwert gegen ein Ziel. Ein
  // Bereich, der nicht laedt, soll die anderen nicht mit sperren.
  const goal = profile ? effectiveCalorieGoal(profile) : null
  const status = kalorienStatus(sumKalorien(entries), goal)
  const gewichtAktuell = latestValue(rows, 'gewicht')
  const gewichtsAenderung = changeSince(rows, 'gewicht')

  const kacheln: StatTile[] = [
    { label: 'Streak', wert: streak === 0 ? '—' : String(streak), hinweis: streakText(streak) },
    {
      label: 'Gewicht',
      wert: gewichtAktuell == null ? '—' : `${formatValue(gewichtAktuell.value)} kg`,
      // latestValue may find a weight without a prior entry to compare against —
      // changeSince is then null, and the tile must still show the current
      // value (a first-time weigh-in) instead of collapsing to "Keine Messwerte.".
      hinweis:
        gewichtAktuell == null
          ? 'Keine Messwerte.'
          : gewichtsAenderung == null
            ? undefined
            : `${gewichtsAenderung.delta < 0 ? '−' : '+'}${formatValue(Math.abs(gewichtsAenderung.delta))} kg seit dem letzten Eintrag`,
    },
  ]

  return (
    <div>
      <h1>Home</h1>
      {rowsError && <p role="alert">Gewichtsdaten konnten nicht geladen werden.</p>}
      <StatStrip tiles={kacheln} />
      {trainingError && <p role="alert">Training konnte nicht geladen werden.</p>}
      {!trainingError && plan == null && (
        <EmptyState
          titel="Kein aktiver Plan."
          text="Lege einen Plan an, dann siehst du hier, was heute ansteht."
          action={
            <PressableLink variant="primary" to="/training/plans">
              Trainingsplan anlegen
            </PressableLink>
          }
        />
      )}
      {!trainingError && plan != null && day == null && (
        <EmptyState
          titel={`Plan „${plan.name}“ hat noch keine Tage.`}
          action={
            <PressableLink variant="primary" to={`/training/plans/${plan.id}`}>
              Plan bearbeiten
            </PressableLink>
          }
        />
      )}
      {plan != null && day != null && (
        <PageHero
          label="Heute · Training"
          titel={day.name}
          untertitel={plan.name}
          action={
            <PressableLink variant="primary" to="/training">
              Zum Training
            </PressableLink>
          }
        />
      )}
      <PageHero
        label="Kalorien"
        titel={status.titel}
        untertitel={status.untertitel ?? undefined}
        aside={<ProgressRing anteil={status.anteil} label={status.ringLabel} />}
      />
      <LinkListCard
        items={[
          { to: '/nutrition', label: 'Ernährung', icon: 'nutrition' },
          { to: '/training', label: 'Training', icon: 'training' },
          { to: '/body', label: 'Körper', icon: 'body' },
          { to: '/home/analyse', label: 'Analyse', icon: 'analysis' },
        ]}
      />
      <DashboardHomeCharts userId={userId} auswahl={auswahl.auswahl} />
    </div>
  )
}

/**
 * Rendert die angehakten Home-Graphen — und faellt vorher komplett aus, wenn
 * keiner angehakt ist: der Hook steckt in der Kindkomponente, ein leeres
 * Dashboard soll keine Abfrage ausloesen.
 */
function DashboardHomeCharts({ userId, auswahl }: { userId: string; auswahl: string[] }) {
  const bereichsIds = new Set(chartsFor('home').map((chart) => chart.id))
  const ids = auswahl.filter((id) => bereichsIds.has(id))
  if (ids.length === 0) return null
  return <DashboardHomeChartsData userId={userId} ids={ids} />
}

function DashboardHomeChartsData({ userId, ids }: { userId: string; ids: string[] }) {
  const { sessions, entries, rows, loading, error } = useHomeAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <ChartSkeleton />
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return <HomeChartList ids={ids} sessions={sessions} entries={entries} rows={rows} zeitraum={DASHBOARD_ZEITRAUM} />
}

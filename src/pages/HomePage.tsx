import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import DailySummary from '../components/DailySummary'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { useBodyMetrics } from '../hooks/use-body-metrics'
import { changeSince, latestValue } from '../lib/body-change'
import { useChartSelection } from '../components/charts/ChartPicker'
import HomeChartList from '../components/charts/HomeChartList'
import { chartsFor } from '../lib/analysis/registry'
import { useHomeAnalysis } from '../hooks/use-home-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { cardClass } from '../lib/ui-classes'

/** German notation: comma as the decimal mark, at most one place. */
function formatValue(value: number) {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

export default function HomePage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Home</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading } = useProfile(userId)
  const { entries, loading: entriesLoading } = useFoodEntries(userId)
  const { plan, day, loading: trainingLoading } = useActiveTrainingDay(userId)
  const { rows, loading: rowsLoading, error: rowsError } = useBodyMetrics(userId)
  const auswahl = useChartSelection(userId)

  if (profileLoading || entriesLoading || trainingLoading || rowsLoading) {
    return (
      <div>
        <h1>Home</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  // goal bleibt null, wenn das Profil nicht geladen werden konnte — DailySummary
  // zeigt die Kalorien dann trotzdem an, nur ohne Restwert gegen ein Ziel. Ein
  // Bereich, der nicht laedt, soll die anderen zwei nicht mit sperren.
  const goal = profile ? effectiveCalorieGoal(profile) : null
  const gewichtAktuell = latestValue(rows, 'gewicht')
  const gewichtsAenderung = changeSince(rows, 'gewicht')

  return (
    <div className="space-y-4">
      <h1>Home</h1>
      <DailySummary entries={entries} goal={goal} />
      <Link to="/nutrition">Zum Ernährungsbereich</Link>
      <div className={cardClass}>
        <h2>Training</h2>
        {plan == null && <p>Kein aktiver Plan.</p>}
        {plan != null && day == null && <p>{`Plan „${plan.name}“ hat noch keine Tage.`}</p>}
        {plan != null && day != null && <p>{`${plan.name} — ${day.name}`}</p>}
        <Link to="/training">Zum Trainingsbereich</Link>
      </div>
      <div className={cardClass}>
        <h2>Gewicht</h2>
        {rowsError && <p role="alert">Gewichtsdaten konnten nicht geladen werden.</p>}
        <p>
          {gewichtAktuell == null
            ? 'Keine Messwerte.'
            : // latestValue may find a weight without a prior entry to compare
              // against — changeSince is then null, and the card must still show
              // the current value instead of collapsing to "Keine Messwerte.",
              // which is what a first-time weigh-in would otherwise wrongly say.
              `${formatValue(gewichtAktuell.value)} kg${
                gewichtsAenderung == null
                  ? ''
                  : ` (${gewichtsAenderung.delta < 0 ? '−' : '+'}${formatValue(Math.abs(gewichtsAenderung.delta))} kg seit dem letzten Eintrag)`
              }`}
        </p>
        <Link to="/body">Zum Körperbereich</Link>
      </div>
      <DashboardHomeCharts userId={userId} auswahl={auswahl.auswahl} />
      <Link to="/home/analyse">Analyse</Link>
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
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return <HomeChartList ids={ids} sessions={sessions} entries={entries} rows={rows} zeitraum={DASHBOARD_ZEITRAUM} />
}

import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import { visibleSections } from '../lib/meal-sections'
import { sumKalorien } from '../lib/entry-calories'
import DailySummary from '../components/DailySummary'
import { useChartSelection } from '../components/charts/ChartPicker'
import { E1 } from '../lib/analysis/registry'
import { useNutritionAnalysis } from '../hooks/use-nutrition-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'

// Lazy at this use site too, not just on the analysis page: CaloriesPerDayChart
// pulls in recharts (~136 kB gzipped), and this dashboard is reachable from
// the entry route graph. Without this, recharts would still end up in the
// entry chunk regardless of the analysis page's own lazy import.
const CaloriesPerDayChart = lazy(() => import('../components/charts/CaloriesPerDayChart'))

export default function NutritionPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <NutritionDashboard userId={userId} />
}

function NutritionDashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading, error: profileError, reload } = useProfile(userId)
  const { entries, loading: entriesLoading } = useFoodEntries(userId)
  const auswahl = useChartSelection(userId)

  if (profileLoading || entriesLoading) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p role="alert">Profil konnte nicht geladen werden.</p>
        <button type="button" onClick={() => reload()}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  const goal = effectiveCalorieGoal(profile)

  return (
    <div>
      <h1>Ernährung</h1>
      <DailySummary entries={entries} goal={goal} />
      {goal == null && (
        <p>
          Für ein Tagesziel <Link to="/profile">Profil vervollständigen</Link>.
        </p>
      )}
      <Link to="/profile">Ziel im Profil anpassen</Link>
      <ul role="list">
        {visibleSections(profile, entries).map((section) => {
          const sectionEntries = entries.filter((entry) => entry.mahlzeit === section.slot)
          return (
            <li key={section.slot ?? 'unassigned'}>
              <Link to="/nutrition/entries">
                {`${section.name} — ${Math.round(sumKalorien(sectionEntries))} kcal`}
              </Link>
            </li>
          )
        })}
      </ul>
      <Link to="/nutrition/entries">Einträge ansehen</Link>
      {auswahl.istGewaehlt(E1) && <DashboardCaloriesPerDay userId={userId} ziel={goal} />}
      <Link to="/nutrition/analyse">Analyse</Link>
    </div>
  )
}

/**
 * `ziel` comes in as a prop: the parent already computed effectiveCalorieGoal
 * for DailySummary, so re-reading the profile here would both fetch it a third
 * time on this page and — because it read the raw column — hand the chart a
 * different number than the summary right above it.
 */
function DashboardCaloriesPerDay({ userId, ziel }: { userId: string; ziel: number | null }) {
  const { entries, loading, error } = useNutritionAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return (
    <Suspense fallback={<p>Lädt…</p>}>
      <CaloriesPerDayChart entries={entries} ziel={ziel} />
    </Suspense>
  )
}

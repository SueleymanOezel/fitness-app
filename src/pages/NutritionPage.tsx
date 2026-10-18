import { useState } from 'react'
import { useSession } from '../hooks/use-session'
import { useProfile, type Profile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import { mealSections, visibleSections } from '../lib/meal-sections'
import { sumKalorien } from '../lib/entry-calories'
import { kalorienStatus } from '../lib/calorie-status'
import { MAKRO_FARBEN, MAKRO_LABEL, makroAnteileHeute } from '../lib/analysis/nutrition-charts'
import { localDay } from '../lib/local-time'
import PageHero from '../components/PageHero'
import ProgressRing from '../components/ProgressRing'
import StatStrip from '../components/StatStrip'
import LinkListCard from '../components/LinkListCard'
import QuickAddDialog from '../components/QuickAddDialog'
import PageSkeleton, { ChartSkeleton } from '../components/PageSkeleton'
import { useChartSelection } from '../components/charts/ChartPicker'
import NutritionChartList from '../components/charts/NutritionChartList'
import { chartsFor } from '../lib/analysis/registry'
import { useNutritionAnalysis } from '../hooks/use-nutrition-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { VitaIcon } from '../components/icons/VitaIcon'
import Pressable, { PressableLink } from '../components/Pressable'

export default function NutritionPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Ernährung" />

  return <NutritionDashboard userId={userId} />
}

function NutritionDashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading, error: profileError, reload } = useProfile(userId)
  const { entries, loading: entriesLoading, addEntry } = useFoodEntries(userId)
  const auswahl = useChartSelection(userId)
  const [addOpen, setAddOpen] = useState(false)

  if (profileLoading || entriesLoading) return <PageSkeleton titel="Ernährung" />

  if (profileError || !profile) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p role="alert">Profil konnte nicht geladen werden.</p>
        <Pressable variant="secondary" type="button" className="inline-flex items-center gap-2 self-start" onClick={() => reload()}>
          <VitaIcon name="retry" tone="brand" size={20} />
          Erneut versuchen
        </Pressable>
      </div>
    )
  }

  const goal = effectiveCalorieGoal(profile)
  const status = kalorienStatus(sumKalorien(entries), goal)
  const anteile = makroAnteileHeute(entries, localDay(new Date().toISOString()))
  const makroKacheln = [MAKRO_LABEL.eiweiss, MAKRO_LABEL.kohlenhydrate, MAKRO_LABEL.fett].map((label) => {
    const anteil = anteile.find((eintrag) => eintrag.makro === label)
    return {
      label,
      wert: `${anteil?.gramm ?? 0} g`,
      balken: { anteil: (anteil?.anteil ?? 0) / 100, farbe: MAKRO_FARBEN[label] },
    }
  })
  const sections = visibleSections(profile, entries)

  return (
    <div>
      <h1>Ernährung</h1>
      <PageHero
        label="Heute"
        titel={status.titel}
        untertitel={status.untertitel ?? undefined}
        aside={<ProgressRing anteil={status.anteil} label={status.ringLabel} />}
        action={
          <Pressable variant="primary" type="button" onClick={() => setAddOpen(true)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="add" tone="mono" size={20} />
              Eintrag hinzufügen
            </span>
          </Pressable>
        }
      />
      <QuickAddDialog open={addOpen} onClose={() => setAddOpen(false)} sections={mealSections(profile)} addEntry={addEntry} />
      {goal == null && (
        <p>
          Für ein Tagesziel <PressableLink to="/profile">Profil vervollständigen</PressableLink>.
        </p>
      )}
      <StatStrip tiles={makroKacheln} />
      {sections.length > 0 && (
        <LinkListCard
          items={sections.map((section) => {
            const kcal = `${Math.round(
              sumKalorien(entries.filter((entry) => entry.mahlzeit === section.slot)),
            )} kcal`
            return {
              to: '/nutrition/entries',
              label: section.name,
              wert: kcal,
              // aria-label hält den Namen "<Abschnitt> — <kcal>" als eine Einheit, obwohl die kcal optisch rechts stehen.
              ariaLabel: `${section.name} — ${kcal}`,
            }
          })}
        />
      )}
      <LinkListCard
        items={[
          { to: '/profile', label: 'Ziel im Profil anpassen', icon: 'goal' },
          { to: '/nutrition/entries', label: 'Einträge ansehen', icon: 'entries' },
          { to: '/nutrition/analyse', label: 'Analyse', icon: 'analysis' },
        ]}
      />
      <DashboardNutritionCharts userId={userId} auswahl={auswahl.auswahl} ziel={goal} profile={profile} />
    </div>
  )
}

/**
 * Rendert die angehakten Ernaehrungsgraphen — und faellt vorher komplett aus,
 * wenn keiner angehakt ist: der Hook steckt in der Kindkomponente, ein leeres
 * Dashboard soll keine Abfrage ausloesen.
 */
function DashboardNutritionCharts({
  userId,
  auswahl,
  ziel,
  profile,
}: {
  userId: string
  auswahl: string[]
  ziel: number | null
  profile: Profile
}) {
  const bereichsIds = new Set(chartsFor('nutrition').map((chart) => chart.id))
  const ids = auswahl.filter((id) => bereichsIds.has(id))
  if (ids.length === 0) return null
  return <DashboardNutritionChartsData userId={userId} ids={ids} ziel={ziel} profile={profile} />
}

function DashboardNutritionChartsData({
  userId,
  ids,
  ziel,
  profile,
}: {
  userId: string
  ids: string[]
  ziel: number | null
  profile: Profile
}) {
  const { entries, sessions, loading, error } = useNutritionAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <ChartSkeleton />
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return (
    <NutritionChartList
      ids={ids}
      entries={entries}
      sessions={sessions}
      ziel={ziel}
      profile={profile}
    />
  )
}

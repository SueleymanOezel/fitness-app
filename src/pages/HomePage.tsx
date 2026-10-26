import { useEffect, useState } from 'react'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal, zielHeute } from '../lib/nutrition-goal'
import { sumKalorien } from '../lib/entry-calories'
import { kalorienStatus } from '../lib/calorie-status'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { useBodyMetrics } from '../hooks/use-body-metrics'
import { changeSince, latestValue } from '../lib/body-change'
import { useChartSelectionFor } from '../components/charts/ChartPicker'
import HomeChartList from '../components/charts/HomeChartList'
import { chartsFor } from '../lib/analysis/registry'
import { useHomeAnalysis } from '../hooks/use-home-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { useTrainingStreak } from '../hooks/use-training-streak'
import Pressable, { PressableLink } from '../components/Pressable'
import PageHero from '../components/PageHero'
import { VitaIcon } from '../components/icons/VitaIcon'
import KalorienAufschluesselung from '../components/KalorienAufschluesselung'
import { useTrainingKcalHeute } from '../hooks/use-training-kcal-heute'
import OpenSessionHero from '../components/OpenSessionHero'
import { useOffeneSession } from '../hooks/use-workout-session'
import ProgressRing from '../components/ProgressRing'
import StatStrip, { type StatTile } from '../components/StatStrip'
import { cardClass, labelClass, rowLinkClass } from '../lib/ui-classes'
import { useNutritionAnalysis } from '../hooks/use-nutrition-analysis'
import { gewichtDieseWoche, kalorienSchnittDieseWoche, wochenAussage } from '../lib/week-summary'
import { MEASUREMENT_FIELDS, today, type BodyMetricRow, type BodyMetricValues } from '../lib/body-metrics'
import EmptyState from '../components/EmptyState'
import PageSkeleton, { ChartSkeleton } from '../components/PageSkeleton'
import BodyEntryDialog from '../components/BodyEntryDialog'
import QuickAddDialog from '../components/QuickAddDialog'
import { mealSections } from '../lib/meal-sections'
import ErststartDialog from '../components/ErststartDialog'
import ErsteSchritte from '../components/ErsteSchritte'
import { ersteSchritteFertig, erststartGesehen, merkeErsteSchritteFertig, merkeErststartGesehen } from '../lib/first-start'

const LEERE_WERTE = Object.fromEntries(MEASUREMENT_FIELDS.map((feld) => [feld, null])) as BodyMetricValues

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
  const profileResult = useProfile(userId)
  const { profile, loading: profileLoading, updateProfile } = profileResult
  const { entries, loading: entriesLoading, addEntry } = useFoodEntries(userId)
  const { plan, day, loading: trainingLoading, error: trainingError } = useActiveTrainingDay(userId)
  const { rows, loading: rowsLoading, error: rowsError, saveEntry } = useBodyMetrics(userId)
  const { streak, loading: streakLoading } = useTrainingStreak(userId)
  const offen = useOffeneSession(userId)
  const auswahl = useChartSelectionFor(profileResult)
  const trainingKcal = useTrainingKcalHeute(userId)
  // Home is where the day starts: weighing in and logging a meal open right here (re-audit 24.10.2026).
  const [gewichtOffen, setGewichtOffen] = useState(false)
  const [mahlzeitOffen, setMahlzeitOffen] = useState(false)
  // Decided once the profile is in; stays open through step 3 even though the goal is set by then.
  const [erststart, setErststart] = useState<'offen' | 'zu' | null>(null)
  // A fresh key on every opening starts the dialog at step 1 again.
  const [erststartRunde, setErststartRunde] = useState(0)
  const zielGesetzt = profile != null && effectiveCalorieGoal(profile) != null
  const alleSchritte = zielGesetzt && plan != null && rows.length > 0 && entries.length > 0
  useEffect(() => {
    if (alleSchritte) merkeErsteSchritteFertig(userId)
  }, [alleSchritte, userId])

  if (profileLoading || entriesLoading || trainingLoading || rowsLoading || streakLoading) {
    return <PageSkeleton titel="Home" />
  }

  // goal bleibt null, wenn das Profil nicht geladen werden konnte — die Kalorien-Karte
  // zeigt das Gegessene dann trotzdem, nur ohne Restwert gegen ein Ziel. Ein
  // Bereich, der nicht laedt, soll die anderen nicht mit sperren.
  if (erststart === null && profile) {
    setErststart(!zielGesetzt && !erststartGesehen(userId) ? 'offen' : 'zu')
  }
  function erststartZu() {
    merkeErststartGesehen(userId)
    setErststart('zu')
  }

  // Only after a first start on this device, until all four were done once: an older account without
  // a plan gets the plain empty state below instead.
  const ersteSchritte =
    profile != null && erststart === 'zu' && erststartGesehen(userId) && !alleSchritte && !ersteSchritteFertig(userId)

  const goal = profile ? zielHeute(profile, trainingKcal) : null
  const status = kalorienStatus(sumKalorien(entries), goal, trainingKcal)
  const gewichtAktuell = latestValue(rows, 'gewicht')
  const gewichtsAenderung = changeSince(rows, 'gewicht')

  const kacheln: StatTile[] = [
    // A first week has no completed plan weeks yet: show this week's progress instead of a bare "—".
    streak.wochen === 0
      ? { label: 'Diese Woche', wert: `${streak.dieseWoche} von ${streak.ziel}`, hinweis: 'Trainings im Plan', to: '/training' }
      : { label: 'Wochen im Plan', wert: String(streak.wochen), hinweis: `Diese Woche ${streak.dieseWoche} von ${streak.ziel}`, to: '/training' },
    {
      label: 'Gewicht',
      onClick: () => setGewichtOffen(true),
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
      {/* The first start's open ends (re-audit 26.10.2026). */}
      {ersteSchritte && (
        <ErsteSchritte
          schritte={[
            {
              label: 'Tagesziel festlegen',
              erledigt: zielGesetzt,
              onClick: () => {
                setErststartRunde((runde) => runde + 1)
                setErststart('offen')
              },
            },
            { label: 'Trainingsplan anlegen', erledigt: plan != null, to: '/training/plans/new' },
            { label: 'Erstes Gewicht eintragen', erledigt: rows.length > 0, onClick: () => setGewichtOffen(true) },
            { label: 'Heute eine Mahlzeit eintragen', erledigt: entries.length > 0, onClick: () => setMahlzeitOffen(true) },
          ]}
        />
      )}
      {profile && (
        <ErststartDialog
          key={erststartRunde}
          open={erststart === 'offen'}
          onClose={erststartZu}
          profile={profile}
          updateProfile={updateProfile}
          // On a failed plan load the assistant step is skipped rather than offered blindly.
          hatPlan={plan != null || trainingError}
          ersteWiegung={
            rows.length > 0 || rowsError
              ? null
              : (gewicht) => saveEntry(today(), { ...LEERE_WERTE, gewicht })
          }
        />
      )}
      <StatStrip tiles={kacheln} />
      {trainingError && <p role="alert">Training konnte nicht geladen werden.</p>}
      {/* The checklist already carries "Trainingsplan anlegen" for a new account. */}
      {!trainingError && plan == null && !ersteSchritte && (
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
      {offen !== null && <OpenSessionHero offen={offen} />}
      {offen === null && plan != null && day != null && (
        <PageHero
          label="Heute · Training"
          bereich="training"
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
        bereich="ernaehrung"
        titel={status.titel}
        untertitel={status.untertitel ?? undefined}
        aside={<ProgressRing anteil={status.anteil} label={status.ringLabel} />}
        details={profile && <KalorienAufschluesselung userId={userId} profile={profile} trainingKcal={trainingKcal} />}
        action={
          profile && (
            <Pressable variant="secondary" type="button" onClick={() => setMahlzeitOffen(true)}>
              <span className="inline-flex items-center justify-center gap-2">
                <VitaIcon name="add" tone="mono" size={20} />
                Eintrag hinzufügen
              </span>
            </Pressable>
          )
        }
      />
      <BodyEntryDialog open={gewichtOffen} onClose={() => setGewichtOffen(false)} rows={rows} saveEntry={saveEntry} />
      {profile && (
        <QuickAddDialog
          open={mahlzeitOffen}
          onClose={() => setMahlzeitOffen(false)}
          sections={mealSections(profile)}
          addEntry={addEntry}
        />
      )}
      <WochenKarte userId={userId} trainings={streak.dieseWoche} rows={rows} />
      <DashboardHomeCharts userId={userId} auswahl={auswahl.auswahl} />
    </div>
  )
}

/**
 * "Diese Woche" in einem Satz, verlinkt auf die Analyse. Trainings und Gewicht
 * liegen schon vor; die Kalorien kommen per eigener Abfrage und erscheinen,
 * sobald sie da sind — die Karte wartet nicht darauf.
 */
function WochenKarte({ userId, trainings, rows }: { userId: string; trainings: number; rows: BodyMetricRow[] }) {
  const { entries } = useNutritionAnalysis(userId, 30)
  const text = wochenAussage({
    trainings,
    gewicht: gewichtDieseWoche(rows),
    kalorien: kalorienSchnittDieseWoche(entries),
  })
  return (
    <div className={cardClass}>
      <p className={labelClass}>Diese Woche</p>
      <p className="text-lg font-semibold">{text}</p>
      <PressableLink to="/home/analyse" className={rowLinkClass}>
        <VitaIcon name="analysis" tone="brand" size={20} />
        <span>Zur Analyse</span>
        <span aria-hidden="true" className="ml-auto text-text-muted">
          ›
        </span>
      </PressableLink>
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

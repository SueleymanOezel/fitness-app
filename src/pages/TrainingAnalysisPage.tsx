import { useState } from 'react'
import { useSession } from '../hooks/use-session'
import { useTrainingAnalysis } from '../hooks/use-training-analysis'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import { useChartSelection, AnpassenSchalter, AnpassenListe } from '../components/charts/ChartPicker'
import ExerciseSelect from '../components/charts/ExerciseSelect'
import { useUebungsauswahl } from '../components/charts/useUebungsauswahl'
import { trainingsErkenntnisse } from '../lib/analysis/erkenntnisse'
import { cardClass } from '../lib/ui-classes'
import TrainingChartList from '../components/charts/TrainingChartList'
import { chartsFor, T1, T2, T8 } from '../lib/analysis/registry'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'
import PageSkeleton, { ChartSkeleton } from '../components/PageSkeleton'

export default function TrainingAnalysisPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return <PageSkeleton titel="Analyse" />
  }

  return <Analyse userId={userId} />
}

function Analyse({ userId }: { userId: string }) {
  const [zeitraum, setZeitraum] = useState<Zeitraum>(STANDARD_ZEITRAUM)
  const { sessions, sets, loading, error } = useTrainingAnalysis(userId, zeitraum)
  const auswahl = useChartSelection(userId)
  const uebung = useUebungsauswahl(sets)
  // The three that answer the evening question first; the rest stays a tap away.
  const haupt = [T1, T2, T8]
  const weitere = chartsFor('training')
    .map((chart) => chart.id)
    .filter((id) => !haupt.includes(id))
  const erkenntnisse = trainingsErkenntnisse(sessions, sets)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      <AnpassenSchalter auswahl={auswahl} />
      {/* One message for the area, not one per chart: eight identical alerts
          between the charts would be noise, not information. */}
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <ChartSkeleton />
      ) : auswahl.anpassen ? (
        <AnpassenListe bereich="training" auswahl={auswahl} />
      ) : (
        <>
          {erkenntnisse.length > 0 && (
            <section className={cardClass} aria-label="Kurz gesagt">
              <h2>Kurz gesagt</h2>
              <ul role="list" className="flex flex-col gap-2">
                {erkenntnisse.map((satz) => (
                  <li key={satz}>{satz}</li>
                ))}
              </ul>
            </section>
          )}
          {/* One choice for every exercise chart (Kraft, Volumen, Satzgewicht, Wiederholungen). */}
          <ExerciseSelect optionen={uebung.optionen} wert={uebung.exerciseId} onChange={uebung.waehlen} />
          <TrainingChartList
            ids={haupt}
            sessions={sessions}
            sets={sets}
            auswahl={auswahl}
            uebung={uebung.exerciseId}
            leerCta={{ label: 'Training starten', to: '/training' }}
          />
          <details className="group">
            <summary className="min-h-11 cursor-pointer py-2.5 font-medium">{`Mehr Graphen (${weitere.length})`}</summary>
            <div className="pt-4">
              <TrainingChartList ids={weitere} sessions={sessions} sets={sets} auswahl={auswahl} uebung={uebung.exerciseId} />
            </div>
          </details>
        </>
      )}
    </div>
  )
}

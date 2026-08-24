import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { ProfileWeightSyncError, useBodyMetrics } from '../hooks/use-body-metrics'
import { changeSince, latestValue } from '../lib/body-change'
import {
  FIELD_LABELS,
  MEASUREMENT_FIELDS,
  today,
  type MeasurementField,
} from '../lib/body-metrics'
import BodyEntryForm from '../components/BodyEntryForm'
import { useChartSelection } from '../components/charts/ChartPicker'
import { K1 } from '../lib/analysis/registry'
import { useBodyAnalysis } from '../hooks/use-body-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'

// Lazy at this use site too, not just on the analysis page: WeightTrendChart
// pulls in recharts (~136 kB gzipped), and this dashboard is reachable from
// the entry route graph. Without this, recharts would still end up in the
// entry chunk regardless of the analysis page's own lazy import.
const WeightTrendChart = lazy(() => import('../components/charts/WeightTrendChart'))

/** German notation: comma as the decimal mark, at most one place. */
function formatValue(value: number) {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

/** Unit lives in the label, so it is taken from there rather than duplicated. */
function unitOf(field: MeasurementField) {
  const match = FIELD_LABELS[field].match(/\(([^)]+)\)/)
  return match ? match[1] : ''
}

export default function BodyPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Körper</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { rows, loading, error, saveEntry } = useBodyMetrics(userId)
  const [formOpen, setFormOpen] = useState(false)
  const [syncNotice, setSyncNotice] = useState('')
  const auswahl = useChartSelection(userId)

  if (loading) {
    return (
      <div>
        <h1>Körper</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Körper</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}

      <ul role="list">
        {MEASUREMENT_FIELDS.map((field) => {
          const latest = latestValue(rows, field)
          const change = changeSince(rows, field)
          return (
            <li key={field}>
              <span>{FIELD_LABELS[field]}</span>
              <span data-testid={`wert-${field}`}>
                {latest == null ? '—' : `${formatValue(latest.value)} ${unitOf(field)}`}
              </span>
              {latest != null && <span>{`Stand ${formatDate(latest.datum)}`}</span>}
              {change != null && (
                <span>
                  {/* U+2212 minus, not a hyphen: it lines up with digits. */}
                  {`${change.delta < 0 ? '−' : '+'}${formatValue(Math.abs(change.delta))} ${unitOf(field)} seit ${formatDate(change.datum)}`}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {syncNotice !== '' && <p role="alert">{syncNotice}</p>}

      {formOpen ? (
        <BodyEntryForm
          // The upsert writes all seven columns, so an empty form would blank
          // everything already recorded today. Correcting the day means
          // starting from what is stored, not from blanks.
          entry={rows.find((row) => row.datum === today())}
          onSave={async (datum, values) => {
            setSyncNotice('')
            try {
              await saveEntry(datum, values)
            } catch (err) {
              // The entry was already written and the list already reloaded;
              // only the profiles mirror failed. Resolve normally so the form
              // closes without its own "not saved" alert — that message would
              // be wrong here, and this page (which stays on screen) is the
              // right place for the real one.
              if (err instanceof ProfileWeightSyncError) {
                setSyncNotice(
                  'Eintrag gespeichert. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.',
                )
                return
              }
              throw err
            }
          }}
          onClose={() => setFormOpen(false)}
        />
      ) : (
        <button type="button" onClick={() => setFormOpen(true)}>
          Heute eintragen
        </button>
      )}

      {auswahl.istGewaehlt(K1) && <DashboardWeightTrend userId={userId} />}
      <Link to="/body/analyse">Analyse</Link>
      <Link to="/body/entries">Verlauf</Link>
      <Link to="/body/photos">Fortschrittsfotos</Link>
    </div>
  )
}

/**
 * Own component so the query only runs when the chart is actually pinned:
 * hooks cannot be called conditionally, and an unpinned chart must not cost a
 * request.
 */
function DashboardWeightTrend({ userId }: { userId: string }) {
  const { rows, loading, error } = useBodyAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return (
    <Suspense fallback={<p>Lädt…</p>}>
      <WeightTrendChart rows={rows} />
    </Suspense>
  )
}

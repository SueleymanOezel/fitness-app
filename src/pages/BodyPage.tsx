import { useState } from 'react'
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
import BodyChartList from '../components/charts/BodyChartList'
import { chartsFor } from '../lib/analysis/registry'
import { useBodyAnalysis } from '../hooks/use-body-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { cardClass, buttonPrimaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'

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
  const showToast = useToast()
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

      <ul role="list" className="grid grid-cols-2 gap-4">
        {MEASUREMENT_FIELDS.map((field) => {
          const latest = latestValue(rows, field)
          const change = changeSince(rows, field)
          return (
            <li key={field} className="block border-b-0">
              <div className={`${cardClass} w-full flex flex-col items-start gap-1`}>
                <span className="text-sm text-text-muted">{FIELD_LABELS[field]}</span>
                <span className="text-2xl font-semibold" data-testid={`wert-${field}`}>
                  {latest == null ? '—' : `${formatValue(latest.value)} ${unitOf(field)}`}
                </span>
                {latest != null && (
                  <span className="text-sm text-text-muted">{`Stand ${formatDate(latest.datum)}`}</span>
                )}
                {change != null && (
                  <span className="text-sm text-text-muted">
                    {/* U+2212 minus, not a hyphen: it lines up with digits. */}
                    {`${change.delta < 0 ? '−' : '+'}${formatValue(Math.abs(change.delta))} ${unitOf(field)} seit ${formatDate(change.datum)}`}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <button type="button" className={buttonPrimaryClass} onClick={() => setFormOpen(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="measurement" tone="mono" size={20} />
          Heute eintragen
        </span>
      </button>
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the form only while open forces a fresh prefill from the
          current rows each time it opens, instead of showing the last
          attempt's leftover draft. */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)}>
        {formOpen && (
          <BodyEntryForm
            // The upsert writes all seven columns, so an empty form would blank
            // everything already recorded today. Correcting the day means
            // starting from what is stored, not from blanks.
            entry={rows.find((row) => row.datum === today())}
            onSave={async (datum, values) => {
              try {
                await saveEntry(datum, values)
              } catch (err) {
                // The entry was already written and the list already reloaded;
                // only the profiles mirror failed. Resolve normally so the
                // dialog closes without its own "not saved" alert — the dialog
                // is already gone by the time this notice appears, so it is
                // short-lived feedback on a completed action, not a blocking
                // form error, hence a toast rather than inline.
                if (err instanceof ProfileWeightSyncError) {
                  showToast(
                    'Eintrag gespeichert. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.',
                    'error',
                  )
                  return
                }
                throw err
              }
            }}
            onClose={() => setFormOpen(false)}
          />
        )}
      </Dialog>

      <DashboardBodyCharts userId={userId} auswahl={auswahl.auswahl} />
      <Link to="/body/analyse" className="flex items-center justify-center gap-2">
        <VitaIcon name="analysis" tone="brand" size={20} />
        Analyse
      </Link>
      <Link to="/body/entries" className="flex items-center justify-center gap-2">
        <VitaIcon name="history" tone="brand" size={20} />
        Verlauf
      </Link>
      <Link to="/body/photos" className="flex items-center justify-center gap-2">
        <VitaIcon name="photos" tone="brand" size={20} />
        Fortschrittsfotos
      </Link>
    </div>
  )
}

/**
 * Rendert die angehakten Koerpergraphen — und faellt vorher komplett aus, wenn
 * keiner angehakt ist: der Hook steckt in der Kindkomponente, ein leeres
 * Dashboard soll keine Abfrage ausloesen.
 */
function DashboardBodyCharts({ userId, auswahl }: { userId: string; auswahl: string[] }) {
  const bereichsIds = new Set(chartsFor('body').map((chart) => chart.id))
  const ids = auswahl.filter((id) => bereichsIds.has(id))
  if (ids.length === 0) return null
  return <DashboardBodyChartsData userId={userId} ids={ids} />
}

function DashboardBodyChartsData({ userId, ids }: { userId: string; ids: string[] }) {
  const { rows, kalorien, fotos, loading, error } = useBodyAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return (
    <BodyChartList
      ids={ids}
      rows={rows}
      kalorien={kalorien}
      fotos={fotos}
      leerCta={{ label: 'Heute eintragen', to: '/body' }}
    />
  )
}

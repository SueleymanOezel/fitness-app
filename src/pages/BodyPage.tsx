import { useState } from 'react'
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
import { cardClass, listClass, statClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import Pressable from '../components/Pressable'
import PageHero from '../components/PageHero'
import LinkListCard from '../components/LinkListCard'
import PageSkeleton, { ChartSkeleton } from '../components/PageSkeleton'

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

  if (!userId) return <PageSkeleton titel="Körper" />

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { rows, loading, error, saveEntry } = useBodyMetrics(userId)
  const [formOpen, setFormOpen] = useState(false)
  const showToast = useToast()
  const auswahl = useChartSelection(userId)

  if (loading) return <PageSkeleton titel="Körper" />

  const gewicht = latestValue(rows, 'gewicht')
  const gewichtAenderung = changeSince(rows, 'gewicht')
  const weitereFelder = MEASUREMENT_FIELDS.filter((field) => field !== 'gewicht')

  return (
    <div>
      <h1>Körper</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}

      <PageHero
        label={FIELD_LABELS.gewicht}
        titel={gewicht == null ? '—' : `${formatValue(gewicht.value)} ${unitOf('gewicht')}`}
        titelClass={statClass}
        titelTestId="wert-gewicht"
        untertitel={
          gewicht == null ? (
            error ? undefined : 'Noch kein Gewicht eingetragen.'
          ) : (
            <>
              <span className="block">{`Stand ${formatDate(gewicht.datum)}`}</span>
              {gewichtAenderung != null && (
                <span className="block">
                  {/* U+2212 minus, not a hyphen: it lines up with digits. */}
                  {`${gewichtAenderung.delta < 0 ? '−' : '+'}${formatValue(Math.abs(gewichtAenderung.delta))} ${unitOf('gewicht')} seit ${formatDate(gewichtAenderung.datum)}`}
                </span>
              )}
            </>
          )
        }
        action={
          <Pressable variant="primary" type="button" onClick={() => setFormOpen(true)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="measurement" tone="mono" size={20} />
              Heute eintragen
            </span>
          </Pressable>
        }
      />
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

      <div className={cardClass}>
        <ul role="list" className={listClass}>
          {weitereFelder.map((field) => {
            const latest = latestValue(rows, field)
            const change = changeSince(rows, field)
            return (
              <li key={field} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p>{FIELD_LABELS[field]}</p>
                  {change != null && (
                    <p className="text-sm text-text-muted">
                      {`${change.delta < 0 ? '−' : '+'}${formatValue(Math.abs(change.delta))} ${unitOf(field)} seit ${formatDate(change.datum)}`}
                    </p>
                  )}
                </div>
                <span className="text-lg font-semibold tabular-nums" data-testid={`wert-${field}`}>
                  {latest == null ? '—' : `${formatValue(latest.value)} ${unitOf(field)}`}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <LinkListCard
        items={[
          { to: '/body/entries', label: 'Verlauf', icon: 'history' },
          { to: '/body/photos', label: 'Fortschrittsfotos', icon: 'photos' },
          { to: '/body/analyse', label: 'Analyse', icon: 'analysis' },
        ]}
      />
      <DashboardBodyCharts userId={userId} auswahl={auswahl.auswahl} />
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
  if (loading) return <ChartSkeleton />
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return (
    <BodyChartList
      ids={ids}
      rows={rows}
      kalorien={kalorien}
      fotos={fotos}
    />
  )
}

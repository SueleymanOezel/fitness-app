import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { ProfileWeightSyncError, useBodyMetrics } from '../hooks/use-body-metrics'
import {
  FIELD_LABELS,
  MEASUREMENT_FIELDS,
  type BodyMetricRow,
} from '../lib/body-metrics'
import BodyEntryForm from '../components/BodyEntryForm'
import { cardClass, buttonSecondaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import { VitaIcon } from '../components/icons/VitaIcon'
import { useToast } from '../components/ToastProvider'

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

/** Only the measurements that were actually taken, so a row stays readable. */
function summarize(entry: BodyMetricRow) {
  return MEASUREMENT_FIELDS.filter((field) => entry[field] != null)
    .map((field) => `${FIELD_LABELS[field]}: ${entry[field]}`)
    .join(' · ')
}

export default function BodyEntriesPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Verlauf</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Entries userId={userId} />
}

function Entries({ userId }: { userId: string }) {
  const { rows, loading, error, saveEntry, deleteEntry } = useBodyMetrics(userId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const showToast = useToast()

  if (loading) {
    return (
      <div>
        <h1>Verlauf</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  async function remove(id: string) {
    try {
      await deleteEntry(id)
    } catch (err) {
      // The entry was already deleted and the list already reloaded; only the
      // profiles mirror failed afterwards. Saying "not deleted" here would be a
      // lie that sends the user to retry an action that already happened.
      if (err instanceof ProfileWeightSyncError) {
        showToast(
          'Eintrag gelöscht. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.',
          'error',
        )
        return
      }
      showToast('Eintrag konnte nicht gelöscht werden.', 'error')
    }
  }

  const editingEntry = rows.find((row) => row.id === editingId)

  return (
    <div>
      <h1>Verlauf</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}
      {rows.length === 0 && <p>Noch keine Einträge.</p>}

      <ul role="list" className="space-y-4">
        {rows.map((entry) => (
          <li key={entry.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              <span>{formatDate(entry.datum)}</span>
              <span>{summarize(entry)}</span>
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => setEditingId(entry.id)}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <VitaIcon name="edit" tone="mono" size={20} />
                  Bearbeiten
                </span>
              </button>
              <button type="button" className={buttonSecondaryClass} onClick={() => remove(entry.id)}>
                <span className="inline-flex items-center justify-center gap-2">
                  <VitaIcon name="delete" tone="mono" size={20} />
                  Löschen
                </span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the form only while open forces a fresh prefill from the
          entry each time it opens, instead of showing the last attempt's
          leftover draft. One shared dialog for the whole list, not one per
          row: editingId already guarantees only one row is ever being edited
          at a time. */}
      <Dialog open={editingId !== null} onClose={() => setEditingId(null)}>
        {editingEntry && (
          <BodyEntryForm
            entry={editingEntry}
            onSave={async (datum, values) => {
              try {
                await saveEntry(datum, values)
              } catch (err) {
                // Same reasoning as remove(): the write already succeeded,
                // only the profile mirror is stale. Resolve normally so the
                // dialog closes without its own "not saved" alert.
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
            onClose={() => setEditingId(null)}
          />
        )}
      </Dialog>

      <Link to="/body" className="flex items-center justify-center gap-2">
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zum Körperbereich
      </Link>
    </div>
  )
}

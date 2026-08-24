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
  const [actionError, setActionError] = useState('')

  if (loading) {
    return (
      <div>
        <h1>Verlauf</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  async function remove(id: string) {
    setActionError('')
    try {
      await deleteEntry(id)
    } catch (err) {
      // The entry was already deleted and the list already reloaded; only the
      // profiles mirror failed afterwards. Saying "not deleted" here would be a
      // lie that sends the user to retry an action that already happened.
      if (err instanceof ProfileWeightSyncError) {
        setActionError(
          'Eintrag gelöscht. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.',
        )
        return
      }
      setActionError('Eintrag konnte nicht gelöscht werden.')
    }
  }

  return (
    <div>
      <h1>Verlauf</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}
      {rows.length === 0 && <p>Noch keine Einträge.</p>}

      <ul role="list">
        {rows.map((entry) => (
          <li key={entry.id}>
            {editingId === entry.id ? (
              <BodyEntryForm
                entry={entry}
                onSave={async (datum, values) => {
                  setActionError('')
                  try {
                    await saveEntry(datum, values)
                  } catch (err) {
                    // Same reasoning as remove(): the write already succeeded,
                    // only the profile mirror is stale. Resolve normally so the
                    // form closes without its own "not saved" alert.
                    if (err instanceof ProfileWeightSyncError) {
                      setActionError(
                        'Eintrag gespeichert. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.',
                      )
                      return
                    }
                    throw err
                  }
                }}
                onClose={() => setEditingId(null)}
              />
            ) : (
              <>
                <span>{formatDate(entry.datum)}</span>
                <span>{summarize(entry)}</span>
                <button type="button" onClick={() => setEditingId(entry.id)}>
                  Bearbeiten
                </button>
                <button type="button" onClick={() => remove(entry.id)}>
                  Löschen
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {actionError !== '' && <p role="alert">{actionError}</p>}
      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}

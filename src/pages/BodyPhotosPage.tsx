import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useBodyPhotos } from '../hooks/use-body-photos'
import type { BodyPhoto } from '../hooks/use-body-photos'
import { today } from '../lib/body-metrics'
import { cardClass, buttonSecondaryClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

export default function BodyPhotosPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Fortschrittsfotos</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Photos userId={userId} />
}

function Photos({ userId }: { userId: string }) {
  const { photos, loading, error, uploadPhoto, deletePhoto } = useBodyPhotos(userId)
  const [datum, setDatum] = useState(today())
  const [busy, setBusy] = useState(false)
  const showToast = useToast()

  if (loading) {
    return (
      <div>
        <h1>Fortschrittsfotos</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset first: picking the same file twice would otherwise fire no change.
    event.target.value = ''
    if (!file) return

    setBusy(true)
    try {
      await uploadPhoto(file, datum)
    } catch {
      showToast('Foto konnte nicht hochgeladen werden.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function remove(photo: BodyPhoto) {
    try {
      await deletePhoto(photo)
    } catch {
      showToast('Foto konnte nicht gelöscht werden.', 'error')
    }
  }

  return (
    <div>
      <h1>Fortschrittsfotos</h1>
      {error && <p role="alert">Fotos konnten nicht geladen werden.</p>}

      <div className={cardClass}>
        <label>
          Datum
          <input type="date" value={datum} onChange={(event) => setDatum(event.target.value)} />
        </label>
        <label>
          Foto
          <input type="file" accept="image/*" disabled={busy} onChange={choose} />
        </label>
      </div>

      {photos.length === 0 && <p>Noch keine Fotos.</p>}

      <ul role="list" className="space-y-4">
        {photos.map((photo) => (
          <li key={photo.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              <span>{formatDate(photo.datum)}</span>
              {photo.url == null ? (
                // A signed link can fail on its own; a bare <img> would just show
                // a broken image and say nothing about why.
                <span>Bild nicht verfügbar</span>
              ) : (
                <img
                  src={photo.url}
                  alt={`Fortschrittsfoto vom ${formatDate(photo.datum)}`}
                  loading="lazy"
                />
              )}
              <button type="button" className={buttonSecondaryClass} onClick={() => remove(photo)}>
                <span className="inline-flex items-center justify-center gap-2">
                  <VitaIcon name="delete" tone="mono" size={20} />
                  Löschen
                </span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Link to="/body" className="flex items-center justify-center gap-2">
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zum Körperbereich
      </Link>
    </div>
  )
}

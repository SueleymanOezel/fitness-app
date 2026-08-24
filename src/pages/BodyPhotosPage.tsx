import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useBodyPhotos } from '../hooks/use-body-photos'
import type { BodyPhoto } from '../hooks/use-body-photos'

function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

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
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)

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

    setActionError('')
    setBusy(true)
    try {
      await uploadPhoto(file, datum)
    } catch {
      setActionError('Foto konnte nicht hochgeladen werden.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(photo: BodyPhoto) {
    setActionError('')
    try {
      await deletePhoto(photo)
    } catch {
      setActionError('Foto konnte nicht gelöscht werden.')
    }
  }

  return (
    <div>
      <h1>Fortschrittsfotos</h1>
      {error && <p role="alert">Fotos konnten nicht geladen werden.</p>}

      <label>
        Datum
        <input type="date" value={datum} onChange={(event) => setDatum(event.target.value)} />
      </label>
      <label>
        Foto
        <input type="file" accept="image/*" disabled={busy} onChange={choose} />
      </label>

      {actionError !== '' && <p role="alert">{actionError}</p>}
      {photos.length === 0 && <p>Noch keine Fotos.</p>}

      <ul role="list">
        {photos.map((photo) => (
          <li key={photo.id}>
            <span>{formatDate(photo.datum)}</span>
            {photo.url == null ? (
              // A signed link can fail on its own; a bare <img> would just show
              // a broken image and say nothing about why.
              <span>Bild nicht verfügbar</span>
            ) : (
              <img src={photo.url} alt={`Fortschrittsfoto vom ${formatDate(photo.datum)}`} />
            )}
            <button type="button" onClick={() => remove(photo)}>
              Löschen
            </button>
          </li>
        ))}
      </ul>

      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}

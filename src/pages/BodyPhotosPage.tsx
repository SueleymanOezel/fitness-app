import { useState, type ChangeEvent } from 'react'
import { useSession } from '../hooks/use-session'
import { useBodyPhotos } from '../hooks/use-body-photos'
import { today } from '../lib/body-metrics'
import { cardClass, fieldLabelClass, inputClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
import ConfirmDelete from '../components/ConfirmDelete'
import PageSkeleton from '../components/PageSkeleton'

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

export default function BodyPhotosPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return <PageSkeleton titel="Fortschrittsfotos" variante="liste" />
  }

  return <Photos userId={userId} />
}

function Photos({ userId }: { userId: string }) {
  const { photos, loading, error, uploadPhoto, deletePhoto } = useBodyPhotos(userId)
  const [datum, setDatum] = useState(today())
  const [busy, setBusy] = useState(false)
  const showToast = useToast()

  if (loading) {
    return <PageSkeleton titel="Fortschrittsfotos" variante="liste" />
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

  return (
    <div>
      <h1>Fortschrittsfotos</h1>
      {error && <p role="alert">Fotos konnten nicht geladen werden.</p>}

      <div className={cardClass}>
        <label className={fieldLabelClass}>
          Datum
          <input className={inputClass} type="date" value={datum} onChange={(event) => setDatum(event.target.value)} />
        </label>
        <label className={fieldLabelClass}>
          Foto
          <input
            className="text-sm text-text-muted file:mr-3 file:rounded-2xl file:border-0 file:bg-surface-raised file:px-4 file:py-2 file:text-text"
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={choose}
          />
        </label>
      </div>

      {photos.length === 0 && <p>Noch keine Fotos.</p>}

      <ul role="list" className="flex flex-col gap-3">
        {photos.map((photo) => (
          <li key={photo.id}>
            <div className={`${cardClass} flex flex-col`}>
              <span className="font-semibold">{formatDate(photo.datum)}</span>
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
              <ConfirmDelete
                label="Löschen"
                className="self-start"
                titel="Foto löschen?"
                text={`Das Foto vom ${formatDate(photo.datum)} wird endgültig gelöscht.`}
                onConfirm={() => deletePhoto(photo)}
              />
            </div>
          </li>
        ))}
      </ul>

    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { resizeToJpeg } from '../lib/image-resize'
import { BODY_PHOTO_BUCKET, signierteFotoLinks } from '../lib/body-photo-urls'

export type BodyPhoto = {
  id: string
  datum: string
  /** Object path in the bucket. The column is named foto_url for historic
   *  reasons, but a URL is never stored — it is signed on demand. */
  pfad: string
  url: string | null
}

export function useBodyPhotos(userId: string) {
  const [photos, setPhotos] = useState<BodyPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const { data, error: loadError } = await supabase
      .from('body_photos')
      .select('id, datum, foto_url')
      .eq('user_id', userId)
      .order('datum', { ascending: false })
    if (current !== requestId.current) return

    const stored = (data ?? []) as { id: string; datum: string; foto_url: string }[]
    // Signed in one call rather than per row: one request instead of N.
    const urls = await signierteFotoLinks(stored.map((row) => row.foto_url))
    if (current !== requestId.current) return

    setPhotos(
      stored.map((row) => ({
        id: row.id,
        datum: row.datum,
        pfad: row.foto_url,
        url: urls.get(row.foto_url) ?? null,
      })),
    )
    setError(Boolean(loadError))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  /**
   * File first, row second: a row pointing at a missing file would show as a
   * broken image, so the row is only written once the file is really there. If
   * the row then fails, the file is removed again — an orphan nobody can see
   * would keep occupying the quota forever.
   */
  async function uploadPhoto(file: File, datum: string) {
    const blob = await resizeToJpeg(file)
    // First path segment is the owner; the storage policy checks exactly that.
    const pfad = `${userId}/${crypto.randomUUID()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from(BODY_PHOTO_BUCKET)
      .upload(pfad, blob, { contentType: 'image/jpeg' })
    if (uploadError) throw new Error('photo upload failed')

    const { error: rowError } = await supabase
      .from('body_photos')
      .insert({ user_id: userId, datum, foto_url: pfad })
    if (rowError) {
      await supabase.storage.from(BODY_PHOTO_BUCKET).remove([pfad])
      throw new Error('photo row failed')
    }

    await reload()
  }

  /**
   * File first here too, for the opposite reason: removing a file that is
   * already gone reports no error, so a retry after a half-failed delete simply
   * works. The reverse order would leave a row without a file behind.
   */
  async function deletePhoto(photo: BodyPhoto) {
    const { error: fileError } = await supabase.storage.from(BODY_PHOTO_BUCKET).remove([photo.pfad])
    if (fileError) throw new Error('photo file delete failed')

    const { error: rowError } = await supabase.from('body_photos').delete().eq('id', photo.id)
    if (rowError) throw new Error('photo row delete failed')

    await reload()
  }

  return { photos, loading, error, uploadPhoto, deletePhoto, reload }
}

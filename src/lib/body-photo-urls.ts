import { supabase } from './supabase'

export const BODY_PHOTO_BUCKET = 'body-photos'
/** One hour is plenty for a page view, and the link never reaches the database. */
export const SIGNED_URL_TTL_SECONDS = 3600

/**
 * Kurzlebige Links zu Foto-Pfaden, gebuendelt in einem Aufruf statt je Zeile.
 *
 * Zwei Hooks brauchen das: die Fotoseite und die Koerperanalyse (K5). Das
 * Aussortieren nicht signierter Eintraege ist der Grund fuer den gemeinsamen
 * Helfer — faellt es an einer Stelle weg, landet `undefined` als `src` im
 * `img`, und das Bild bleibt ohne jede Meldung leer.
 */
export async function signierteFotoLinks(pfade: string[]): Promise<Map<string, string>> {
  if (pfade.length === 0) return new Map()
  const { data } = await supabase.storage
    .from(BODY_PHOTO_BUCKET)
    .createSignedUrls(pfade, SIGNED_URL_TTL_SECONDS)
  return new Map(
    (data ?? [])
      .filter((item): item is typeof item & { signedUrl: string } => item.signedUrl !== null)
      .map((item) => [item.path ?? '', item.signedUrl]),
  )
}

/**
 * Die Seitenschleife hinter jeder Analyseabfrage.
 *
 * PostgREST deckelt eine Antwort bei `db-max-rows` (Vorgabe 1000) und sagt es
 * nicht dazu — eine ungeblätterte Abfrage liefert dann still einen Ausschnitt,
 * der wie ein vollstaendiges Ergebnis aussieht. Dieselbe Schleife stand vorher
 * in `use-training-analysis.ts`; sie liegt hier, damit sie nicht ein drittes
 * Mal abgeschrieben wird.
 */
export const PAGE_SIZE = 500
/** Stops a misconfigured db-max-rows from turning the loop into an endless one. */
export const MAX_PAGES = 40

/** Seitenweise laden, bis eine kurze Seite kommt — sonst schneidet db-max-rows still ab. */
export async function seitenweiseLaden<T>(
  seite: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<{ rows: T[]; failed: boolean }> {
  const rows: T[] = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE
    const { data, error } = await seite(from, from + PAGE_SIZE - 1)
    // Eine fehlgeschlagene Seite wird gemeldet, nicht als vollstaendiges
    // Ergebnis ausgeliefert.
    if (error) return { rows: [], failed: true }
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return { rows, failed: false }
}

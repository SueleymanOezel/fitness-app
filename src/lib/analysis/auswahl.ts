/**
 * The stored selection, reduced to the ids that still answer to a chart.
 *
 * `gespeichert` comes from a jsonb column and is therefore whatever is in the
 * database, not necessarily what we last wrote: a hand-edit or a chart removed
 * in a later version must degrade to "nothing pinned", never to a crash.
 */
export function parseAuswahl(gespeichert: unknown, gueltigeIds: string[]): string[] {
  if (!Array.isArray(gespeichert)) return []
  if (!gespeichert.every((eintrag) => typeof eintrag === 'string')) return []
  const bekannt = new Set(gueltigeIds)
  return [...new Set(gespeichert as string[])].filter((id) => bekannt.has(id))
}

/** Adds or removes one id, always as a new array. */
export function toggleAuswahl(auswahl: string[], id: string): string[] {
  return auswahl.includes(id) ? auswahl.filter((eintrag) => eintrag !== id) : [...auswahl, id]
}

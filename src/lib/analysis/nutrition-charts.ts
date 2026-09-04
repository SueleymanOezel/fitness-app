import { entryKalorien, sumMakro, type MakroEintrag } from '../entry-calories'
import { localDay } from '../local-time'
// entryMakro landet in Task 4 (E3) als zweiter Aufrufer aus dieser Datei; bis
// dahin bleibt es unbenutzt, deshalb hier nicht mitimportiert (noUnusedLocals).

export type TagesPunkt = { tag: string; kalorien: number }

/**
 * Calories per local day, oldest first.
 *
 * Days without entries are left out rather than filled with zero: no entry
 * means "not logged", and a zero bar would read as a fasting day.
 */
export function kalorienJeTag(
  entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[],
): TagesPunkt[] {
  const summeJeTag = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.products) continue
    const tag = localDay(entry.zeitpunkt)
    summeJeTag.set(tag, (summeJeTag.get(tag) ?? 0) + entryKalorien(entry))
  }
  return [...summeJeTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, kalorien]) => ({ tag, kalorien: Math.round(kalorien) }))
}

export type MakroTagEintrag = MakroEintrag & { zeitpunkt: string }
export type MakroAnteil = { makro: string; anteil: number; gramm: number }

const KCAL_JE_GRAMM = { eiweiss: 4, fett: 9, kohlenhydrate: 4 } as const
const MAKRO_LABEL = { eiweiss: 'Eiweiß', fett: 'Fett', kohlenhydrate: 'Kohlenhydrate' } as const

/**
 * E2: heutige Makro-Anteile an der Energie, nicht am Gramm-Gewicht.
 *
 * Fett traegt je Gramm mehr als doppelt so viel Energie wie Eiweiss oder
 * Kohlenhydrate (9 vs. 4 kcal/g) — ein Anteil nach Gramm wuerde einen fetten
 * Tag als ausgewogen ausweisen. Die Gramm-Zahl bleibt als Beschriftung stehen,
 * damit sie gegen DailySummary pruefbar ist.
 */
export function makroAnteileHeute(entries: MakroTagEintrag[], heute: string): MakroAnteil[] {
  const heutige = entries.filter((entry) => localDay(entry.zeitpunkt) === heute)
  const gramm = {
    eiweiss: sumMakro(heutige, 'eiweiss'),
    fett: sumMakro(heutige, 'fett'),
    kohlenhydrate: sumMakro(heutige, 'kohlenhydrate'),
  }
  const kcal = {
    eiweiss: gramm.eiweiss * KCAL_JE_GRAMM.eiweiss,
    fett: gramm.fett * KCAL_JE_GRAMM.fett,
    kohlenhydrate: gramm.kohlenhydrate * KCAL_JE_GRAMM.kohlenhydrate,
  }
  const gesamtKcal = kcal.eiweiss + kcal.fett + kcal.kohlenhydrate
  if (gesamtKcal === 0) return []
  return (['eiweiss', 'fett', 'kohlenhydrate'] as const).map((makro) => ({
    makro: MAKRO_LABEL[makro],
    anteil: Math.round((kcal[makro] / gesamtKcal) * 100),
    gramm: Math.round(gramm[makro]),
  }))
}

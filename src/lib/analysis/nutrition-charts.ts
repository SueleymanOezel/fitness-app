import { entryKalorien, entryMakro, sumMakro, type KalorienEintrag, type MakroEintrag } from '../entry-calories'
import { localDay } from '../local-time'
import { visibleSections, type MealSectionNames } from '../meal-sections'
import { wochenStart, wochenLabel } from './wochen'

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

export type MakroTagPunkt = { tag: string; eiweiss: number; fett: number; kohlenhydrate: number }

/**
 * E3: dieselben drei Makros wie E2, aber die Gramm-Menge ueber die Zeit statt
 * ihr Energie-Anteil an einem einzelnen Tag.
 */
export function makroVerlauf(entries: MakroTagEintrag[]): MakroTagPunkt[] {
  const jeTag = new Map<string, { eiweiss: number; fett: number; kohlenhydrate: number }>()
  for (const entry of entries) {
    const tag = localDay(entry.zeitpunkt)
    const bisher = jeTag.get(tag) ?? { eiweiss: 0, fett: 0, kohlenhydrate: 0 }
    jeTag.set(tag, {
      eiweiss: bisher.eiweiss + entryMakro(entry, 'eiweiss'),
      fett: bisher.fett + entryMakro(entry, 'fett'),
      kohlenhydrate: bisher.kohlenhydrate + entryMakro(entry, 'kohlenhydrate'),
    })
  }
  return [...jeTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, werte]) => ({
      tag,
      eiweiss: Math.round(werte.eiweiss),
      fett: Math.round(werte.fett),
      kohlenhydrate: Math.round(werte.kohlenhydrate),
    }))
}

export type AbschnittPunkt = { name: string; kalorien: number }

/**
 * E4: Kalorien je Mahlzeiten-Abschnitt ueber den ganzen Zeitraum.
 *
 * Nutzt dieselbe Abschnitts-Logik wie die Eintragsliste (`visibleSections`):
 * ein besetzter, aber unbenannter Slot bleibt als "Abschnitt N" sichtbar, ein
 * unzugeordneter Eintrag landet unter "Ohne Zuordnung" statt zu verschwinden.
 */
export function kalorienJeAbschnitt(
  entries: (KalorienEintrag & { mahlzeit: number | null })[],
  namen: MealSectionNames,
): AbschnittPunkt[] {
  return visibleSections(namen, entries).map((section) => ({
    name: section.name,
    kalorien: Math.round(
      entries
        .filter((entry) => entry.mahlzeit === section.slot)
        .reduce((summe, entry) => summe + entryKalorien(entry), 0),
    ),
  }))
}

export type WochenSchnittPunkt = { woche: string; schnitt: number }

/**
 * E5: mittlere Tageskalorien je Kalenderwoche, gemittelt ueber Tage **mit
 * Eintraegen** — nicht ueber alle sieben. `kalorienJeTag` liefert bereits nur
 * solche Tage; zwei getrackte Tage in einer Woche teilen die Summe durch
 * zwei, nicht durch sieben, sonst saehe eine kaum getrackte Woche wie eine
 * strenge Diaetwoche aus.
 */
export function wochenschnitt(
  entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[],
): WochenSchnittPunkt[] {
  const tage = kalorienJeTag(entries)
  const summeJeWoche = new Map<string, number>()
  const tageJeWoche = new Map<string, number>()
  for (const tag of tage) {
    const woche = wochenStart(`${tag.tag}T00:00:00`)
    summeJeWoche.set(woche, (summeJeWoche.get(woche) ?? 0) + tag.kalorien)
    tageJeWoche.set(woche, (tageJeWoche.get(woche) ?? 0) + 1)
  }
  return [...summeJeWoche.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([woche, summe]) => ({
      woche: wochenLabel(woche),
      schnitt: Math.round(summe / (tageJeWoche.get(woche) ?? 1)),
    }))
}

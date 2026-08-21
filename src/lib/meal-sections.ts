export type MealSectionNames = {
  mahlzeit_1_name: string
  mahlzeit_2_name: string
  mahlzeit_3_name: string
  mahlzeit_4_name: string
  mahlzeit_5_name: string | null
  mahlzeit_6_name: string | null
}

export type MealSection = { slot: number; name: string }
export type VisibleSection = { slot: number | null; name: string }

export const UNASSIGNED_LABEL = 'Ohne Zuordnung'

const SLOTS = [1, 2, 3, 4, 5, 6] as const

/** Read by slot number rather than by array position — the number is the stable key. */
function nameAt(names: MealSectionNames, slot: number): string | null {
  const raw = [
    names.mahlzeit_1_name,
    names.mahlzeit_2_name,
    names.mahlzeit_3_name,
    names.mahlzeit_4_name,
    names.mahlzeit_5_name,
    names.mahlzeit_6_name,
  ][slot - 1]
  const trimmed = raw?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

/** The sections in use: every slot that carries a name. */
export function mealSections(names: MealSectionNames): MealSection[] {
  return SLOTS.flatMap((slot) => {
    const name = nameAt(names, slot)
    return name === null ? [] : [{ slot, name }]
  })
}

/**
 * What the entries page renders. Beyond the named sections this keeps an unnamed
 * slot visible while it still holds entries — otherwise those entries disappear
 * from the page while still counting towards the day's total. The unassigned
 * group comes last and only when it is not empty.
 */
export function visibleSections(
  names: MealSectionNames,
  entries: { mahlzeit: number | null }[],
): VisibleSection[] {
  const used = new Set(entries.map((entry) => entry.mahlzeit))

  const sections: VisibleSection[] = SLOTS.flatMap((slot) => {
    const name = nameAt(names, slot)
    if (name !== null) return [{ slot, name }]
    return used.has(slot) ? [{ slot, name: `Abschnitt ${slot}` }] : []
  })

  if (used.has(null)) sections.push({ slot: null, name: UNASSIGNED_LABEL })
  return sections
}

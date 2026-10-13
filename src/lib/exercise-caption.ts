import { equipmentLabel } from './equipment-labels'
import { muskelgruppeLabel } from './muscle-group-labels'

/** "Gerät · erste primäre Muskelgruppe" — Unterzeile in Katalog und Übungsauswahl. */
export function exerciseCaption(exercise: { equipment: string | null; muskelgruppen_primaer: string[] | null }) {
  return [
    exercise.equipment ? equipmentLabel(exercise.equipment) : null,
    exercise.muskelgruppen_primaer?.[0] ? muskelgruppeLabel(exercise.muskelgruppen_primaer[0]) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')
}

/** Staffelung für .list-in — gedeckelt, damit lange Listen nicht sekundenlang nachlaufen. */
export function revealDelay(index: number) {
  return `${Math.min(index, 12) * 30}ms`
}

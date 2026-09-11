import Chip from './Chip'
import { muskelgruppeLabel } from '../lib/muscle-group-labels'
import { equipmentLabel } from '../lib/equipment-labels'

/**
 * Shared muscle-group/equipment chip rows — used on the exercises catalog
 * page and (multi-select) in the training-plan exercise picker, so the two
 * places filter identically instead of drifting apart.
 */
export default function ExerciseFilterChips({
  muskelgruppen,
  muskelgruppe,
  onMuskelgruppeChange,
  equipmentWerte,
  equipment,
  onEquipmentChange,
}: {
  muskelgruppen: string[]
  muskelgruppe: string | null
  onMuskelgruppeChange: (value: string | null) => void
  equipmentWerte: string[]
  equipment: string | null
  onEquipmentChange: (value: string | null) => void
}) {
  return (
    <>
      {muskelgruppen.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip active={muskelgruppe === null} onClick={() => onMuskelgruppeChange(null)}>
            Alle
          </Chip>
          {muskelgruppen.map((gruppe) => (
            <Chip key={gruppe} active={muskelgruppe === gruppe} onClick={() => onMuskelgruppeChange(gruppe)}>
              {muskelgruppeLabel(gruppe)}
            </Chip>
          ))}
        </div>
      )}
      {equipmentWerte.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip active={equipment === null} onClick={() => onEquipmentChange(null)}>
            Alle Geräte
          </Chip>
          {equipmentWerte.map((wert) => (
            <Chip key={wert} active={equipment === wert} onClick={() => onEquipmentChange(wert)}>
              {equipmentLabel(wert)}
            </Chip>
          ))}
        </div>
      )}
    </>
  )
}

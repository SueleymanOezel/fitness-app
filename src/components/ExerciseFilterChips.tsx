import { useId, useState } from 'react'
import Chip from './Chip'
import Pressable from './Pressable'
import { VitaIcon } from './icons/VitaIcon'
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
  const [offen, setOffen] = useState(false)
  const panelId = useId()

  if (muskelgruppen.length === 0 && equipmentWerte.length === 0) return null

  const aktive = [
    muskelgruppe !== null && { label: muskelgruppeLabel(muskelgruppe), entfernen: () => onMuskelgruppeChange(null) },
    equipment !== null && { label: equipmentLabel(equipment), entfernen: () => onEquipmentChange(null) },
  ].filter((eintrag): eintrag is { label: string; entfernen: () => void } => Boolean(eintrag))

  return (
    <div className="space-y-2">
      {/* Unter md eingeklappt; ab md ist das Panel immer offen und der Trigger weg (nur CSS). */}
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <Pressable
          variant="secondary"
          type="button"
          aria-expanded={offen}
          aria-controls={panelId}
          className="md:hidden"
          onClick={() => setOffen(!offen)}
        >
          {aktive.length === 0 ? 'Filter' : `Filter (${aktive.length})`}
        </Pressable>
        {aktive.map((eintrag) => (
          <Chip key={eintrag.label} active aria-label={`Filter ${eintrag.label} entfernen`} onClick={eintrag.entfernen}>
            <span className="inline-flex items-center gap-1">
              {eintrag.label}
              <VitaIcon name="close" tone="mono" size={16} />
            </span>
          </Chip>
        ))}
      </div>
      <div id={panelId} className={`space-y-2 ${offen ? 'block' : 'hidden'} md:block`}>
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
      </div>
    </div>
  )
}

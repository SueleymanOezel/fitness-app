import { cardClass } from '../lib/ui-classes'
import { muskelgruppeLabel } from '../lib/muscle-group-labels'
import { equipmentLabel } from '../lib/equipment-labels'
import { levelLabel } from '../lib/level-labels'
import type { Exercise } from '../hooks/use-exercises'

/**
 * Same visual look as an inactive Chip, but a plain span: these tags are
 * read-only facts about the exercise, not toggleable filters, so they must
 * not carry Chip's button/aria-pressed semantics.
 */
const tagClass = 'rounded-full bg-surface px-4 py-2 font-medium text-text-muted'

export default function ExerciseDetailDialog({ exercise }: { exercise: Exercise }) {
  const muskelgruppen = exercise.muskelgruppen_primaer ?? []
  const anleitung = exercise.anleitung ?? []

  return (
    <div className={`${cardClass} flex flex-col gap-4`}>
      {exercise.bild_url && (
        <img src={exercise.bild_url} alt={exercise.name} className="w-full rounded-2xl object-cover" />
      )}
      <h2>{exercise.name}</h2>
      {(muskelgruppen.length > 0 || exercise.equipment) && (
        <div className="flex flex-wrap gap-2">
          {muskelgruppen.map((gruppe) => (
            <span key={gruppe} className={tagClass}>
              {muskelgruppeLabel(gruppe)}
            </span>
          ))}
          {exercise.equipment && <span className={tagClass}>{equipmentLabel(exercise.equipment)}</span>}
        </div>
      )}
      {exercise.schwierigkeitsgrad && <p>{levelLabel(exercise.schwierigkeitsgrad)}</p>}
      {anleitung.length > 0 ? (
        <ol className="list-decimal space-y-2 pl-5">
          {anleitung.map((schritt, index) => (
            <li key={index}>{schritt}</li>
          ))}
        </ol>
      ) : (
        <p>Keine Anleitung hinterlegt.</p>
      )}
    </div>
  )
}

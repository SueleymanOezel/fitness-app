import { useMahlzeitFavoriten, type Favorit } from '../hooks/use-meal-favorites'
import { cardClass, interactiveClass, labelClass, listClass } from '../lib/ui-classes'
import ConfirmDelete from './ConfirmDelete'
import Pressable from './Pressable'

function kcal(favorit: Favorit) {
  return Math.round(favorit.zutaten.reduce((summe, zutat) => summe + ((zutat.kalorien ?? 0) * zutat.menge) / 100, 0))
}

/**
 * Saved meals at the top of an add dialog: one tap enters the whole meal (re-audit 26.10.2026,
 * efficiency). Renders nothing until there is a favorite, so a new account sees the plain search.
 */
export default function FavoritenListe({ userId, onWaehlen }: { userId: string; onWaehlen: (favorit: Favorit) => void }) {
  const { favoriten, loeschen } = useMahlzeitFavoriten(userId)
  if (favoriten.length === 0) return null

  return (
    <section className={cardClass} aria-labelledby="favoriten-titel">
      <h3 id="favoriten-titel" className="font-semibold">
        Favoriten
      </h3>
      <ul role="list" className={listClass}>
        {favoriten.map((favorit) => (
          <li key={favorit.id} className="flex items-center gap-2 py-1">
            <Pressable
              variant="bare"
              type="button"
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-start rounded-lg text-left ${interactiveClass}`}
              onClick={() => onWaehlen(favorit)}
            >
              <span className="truncate font-medium">{favorit.name}</span>
              <span className={`${labelClass} truncate`}>
                {`${favorit.zutaten.length === 1 ? '1 Lebensmittel' : `${favorit.zutaten.length} Lebensmittel`} · ${kcal(favorit)} kcal`}
              </span>
            </Pressable>
            <ConfirmDelete
              label="Löschen"
              ariaLabel={`Favorit ${favorit.name} löschen`}
              ruhig
              titel="Favorit löschen?"
              text={`„${favorit.name}“ wird gelöscht. Deine Einträge bleiben erhalten.`}
              onConfirm={() => loeschen(favorit.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

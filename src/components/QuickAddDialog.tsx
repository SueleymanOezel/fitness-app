import { useState } from 'react'
import AddEntryFlow from './AddEntryFlow'
import FavoritenListe from './FavoritenListe'
import { useFavoritEintragen } from '../hooks/use-enter-favorite'
import Chip from './Chip'
import Dialog from './Dialog'
import { PressableLink } from './Pressable'
import { abschnittFuerUhrzeit, type MealSection } from '../lib/meal-sections'
import { cardClass, linkClass } from '../lib/ui-classes'

type Props = {
  open: boolean
  onClose: () => void
  sections: MealSection[]
  addEntry: (productId: string, menge: number, mahlzeit: number | null) => Promise<void>
  userId: string
  addEntries: (rows: { product_id: string; menge: number; mahlzeit: number }[]) => Promise<string[]>
  removeEntries: (ids: string[]) => Promise<void>
}

/**
 * Schnell-Eintrag auf dem Ernährungs-Dashboard. Dialog hält seine Kinder auch
 * geschlossen gemountet (siehe Dialog.tsx) — der Inhalt wird deshalb nur bei
 * `open` gerendert, damit Abschnitt, Produkt und Fehler bei jedem Öffnen frisch
 * vorbelegt sind. Fehler bleiben im Dialog (AddEntryFlow zeigt sie inline):
 * ein Toast läge hinter dem Top-Layer des offenen <dialog>.
 */
export default function QuickAddDialog({ open, onClose, ...rest }: Props) {
  return (
    <Dialog open={open} onClose={onClose}>
      {open && <QuickAddForm {...rest} onClose={onClose} />}
    </Dialog>
  )
}

function QuickAddForm({ sections, addEntry, onClose, userId, addEntries, removeEntries }: Omit<Props, 'open'>) {
  const favoritEintragen = useFavoritEintragen(addEntries, removeEntries)
  const [slot, setSlot] = useState<number | null>(() => abschnittFuerUhrzeit(sections, new Date()))

  if (slot === null) {
    return (
      <div className="flex flex-col gap-4">
        <p>Lege im Profil mindestens eine Mahlzeit an, um Einträge zu speichern.</p>
        <PressableLink to="/profile" className={linkClass}>
          Zum Profil
        </PressableLink>
      </div>
    )
  }

  const name = sections.find((section) => section.slot === slot)?.name

  return (
    <div className="flex flex-col gap-4">
      <h2 className="px-6">{name ? `Eintrag für ${name}` : 'Eintrag hinzufügen'}</h2>
      <div className={cardClass}>
        <div role="group" aria-label="Mahlzeit" className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <Chip key={section.slot} active={section.slot === slot} onClick={() => setSlot(section.slot)}>
              {section.name}
            </Chip>
          ))}
        </div>
      </div>
      <FavoritenListe
        userId={userId}
        onWaehlen={(favorit) => {
          onClose()
          void favoritEintragen(favorit, slot)
        }}
      />
      <AddEntryFlow
        onAdd={async (productId, menge) => {
          await addEntry(productId, menge, slot)
          onClose()
        }}
      />
    </div>
  )
}

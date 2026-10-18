import { PressableLink } from './Pressable'
import { VitaIcon, type VitaIconName } from './icons/VitaIcon'
import { cardClass, linkClass, listClass, listRowClass } from '../lib/ui-classes'

export type LinkListItem = {
  to: string
  label: string
  icon?: VitaIconName
  /** Wert rechts, z. B. „150 kcal“. */
  wert?: string
  /** Überschreibt den zugänglichen Namen, wenn Label und Wert zusammen gelesen werden sollen. */
  ariaLabel?: string
}

/** Eine Karte, Zeilen mit dezenter Trennlinie — ersetzt gestapelte Textlinks und Karte-pro-Zeile. */
export default function LinkListCard({ items }: { items: LinkListItem[] }) {
  return (
    <div className={cardClass}>
      <ul role="list" className={listClass}>
        {items.map((item, index) => (
          <li key={`${index}|${item.to}|${item.label}`} className={listRowClass}>
            <PressableLink to={item.to} className={`${linkClass} flex-1`} aria-label={item.ariaLabel}>
              {item.icon && <VitaIcon name={item.icon} tone="brand" size={20} />}
              <span>{item.label}</span>
              {item.wert && <span className="ml-auto tabular-nums text-text">{item.wert}</span>}
              <span aria-hidden="true" className={`${item.wert ? '' : 'ml-auto'} text-text-muted`}>
                ›
              </span>
            </PressableLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

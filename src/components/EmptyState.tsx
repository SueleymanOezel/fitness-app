import type { ReactNode } from 'react'
import { cardClass } from '../lib/ui-classes'

/** Leerzustand mit Ausweg: Titel, ein Satz, eine Aktion (PressableLink oder Pressable). */
export default function EmptyState({ titel, text, action }: { titel: string; text?: string; action?: ReactNode }) {
  return (
    <div className={cardClass}>
      <h2>{titel}</h2>
      {text && <p className="text-text-muted">{text}</p>}
      {action}
    </div>
  )
}

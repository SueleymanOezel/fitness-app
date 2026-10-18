import { cardClass } from '../lib/ui-classes'
import { PressableLink } from '../components/Pressable'

/** Unbekannte Adresse (alter Link, Tippfehler): statt eines leeren Bildschirms ein Ausweg. */
export default function NotFoundPage() {
  return (
    <div>
      <h1>Seite nicht gefunden</h1>
      <div className={cardClass}>
        <p className="text-text-muted">Diese Adresse gibt es nicht (mehr).</p>
        <PressableLink variant="primary" to="/">
          Zur Startseite
        </PressableLink>
      </div>
    </div>
  )
}

import { VitaIcon } from './icons/VitaIcon'
import Pressable from './Pressable'

/** Echter Fehlerzustand statt Leerzustand: ein gescheitertes Laden darf nie wie „nichts da“ aussehen. */
export default function LoadError({ titel, text, onRetry }: { titel: string; text: string; onRetry: () => void }) {
  return (
    <div>
      <h1>{titel}</h1>
      <p role="alert">{text}</p>
      <Pressable variant="secondary" type="button" className="inline-flex items-center gap-2 self-start" onClick={onRetry}>
        <VitaIcon name="retry" tone="brand" size={20} />
        Erneut versuchen
      </Pressable>
    </div>
  )
}

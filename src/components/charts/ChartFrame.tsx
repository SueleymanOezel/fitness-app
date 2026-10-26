import type { ReactNode } from 'react'
import { cardClass, linkClass } from '../../lib/ui-classes'
import { PressableLink } from '../Pressable'
import HilfeKnopf from '../HilfeKnopf'
import type { Begriff } from '../../lib/glossary'

/**
 * Shared shell for every chart: title, the dashboard checkbox, and the empty
 * state. Kept in one place so a chart cannot invent its own wording for
 * "nothing to show yet".
 */
export default function ChartFrame({
  titel,
  leer,
  picker,
  vorspann,
  leerCta,
  zusammenfassung,
  leerHinweis,
  hilfe,
  children,
}: {
  titel: string
  leer: boolean
  picker?: ReactNode
  /**
   * Rendered unconditionally, unlike `children` — for controls that must stay
   * usable even in the empty state (e.g. the exercise select on T2/T3/T4/T5:
   * without it, an empty result for the default exercise leaves no way to
   * pick a different one).
   */
  vorspann?: ReactNode
  /**
   * Link zur zentralen Eintragsaktion des Bereichs, gezeigt statt eines toten
   * Endes im Leerzustand. Von jedem Dashboard/jeder Analyse-Seite einmal fuer
   * alle ihre Charts gesetzt, nicht pro Chart-Typ einzeln.
   */
  leerCta?: { label: string; to: string }
  /**
   * The chart's message in one sentence ("82,4 kg · −2,1 kg seit 20.09."):
   * readable at a glance and the text alternative for a screen reader.
   */
  zusammenfassung?: string
  /** What is still missing, e.g. "Erscheint ab zwei Wiegungen." — a stranger then knows what to do. */
  leerHinweis?: string
  /** A term in the title that a stranger may not know ("1RM", "Volumen"): adds a "?" with its explanation. */
  hilfe?: Begriff
  children: ReactNode
}) {
  return (
    <section className={cardClass}>
      {/* An empty chart steps back: smaller, muted title, so a page of them reads as one "not yet" instead of many headlines. */}
      <h2 className={leer ? 'text-base text-text-muted' : undefined}>
        {titel}
        {hilfe && <HilfeKnopf begriff={hilfe} />}
      </h2>
      {picker}
      {vorspann}
      {leer ? (
        <>
          <p className="text-sm text-text-muted">
            Noch nicht genug Daten für diesen Graphen.{leerHinweis && ` ${leerHinweis}`}
          </p>
          {leerCta && (
            <PressableLink to={leerCta.to} className={linkClass}>
              {leerCta.label}
            </PressableLink>
          )}
        </>
      ) : (
        <>
          {zusammenfassung && <p className="text-sm text-text-muted">{zusammenfassung}</p>}
          <div role={zusammenfassung ? 'img' : undefined} aria-label={zusammenfassung}>
            {children}
          </div>
        </>
      )}
    </section>
  )
}

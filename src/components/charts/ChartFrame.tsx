import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cardClass } from '../../lib/ui-classes'

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
  children: ReactNode
}) {
  return (
    <section className={cardClass}>
      <h2>{titel}</h2>
      {picker}
      {vorspann}
      {leer ? (
        <>
          <p>Noch nicht genug Daten für diesen Graphen.</p>
          {leerCta && (
            <Link to={leerCta.to} className="flex items-center justify-center gap-2">
              {leerCta.label}
            </Link>
          )}
        </>
      ) : (
        children
      )}
    </section>
  )
}

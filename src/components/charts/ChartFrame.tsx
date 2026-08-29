import type { ReactNode } from 'react'

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
  children: ReactNode
}) {
  return (
    <section>
      <h2>{titel}</h2>
      {picker}
      {vorspann}
      {leer ? <p>Noch nicht genug Daten für diesen Graphen.</p> : children}
    </section>
  )
}

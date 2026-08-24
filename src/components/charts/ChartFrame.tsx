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
  children,
}: {
  titel: string
  leer: boolean
  picker?: ReactNode
  children: ReactNode
}) {
  return (
    <section>
      <h2>{titel}</h2>
      {picker}
      {leer ? <p>Noch nicht genug Daten für diesen Graphen.</p> : children}
    </section>
  )
}

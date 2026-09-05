import { sumKalorien, sumMakro } from '../lib/entry-calories'
import type { FoodEntry } from '../hooks/use-food-entries'
import { cardClass } from '../lib/ui-classes'

type Props = {
  entries: FoodEntry[]
  goal: number | null
}

export default function DailySummary({ entries, goal }: Props) {
  const consumedExact = sumKalorien(entries)
  const consumed = Math.round(consumedExact)
  const remaining = goal != null ? Math.round(goal - consumedExact) : null

  return (
    <div className={cardClass}>
      <h2>Heute</h2>
      <p>
        {consumed} kcal verbraucht
        {remaining != null ? `, ${remaining} kcal offen (Ziel ${goal} kcal)` : ''}
      </p>
      <p>
        Eiweiß: {Math.round(sumMakro(entries, 'eiweiss'))} g · Fett: {Math.round(sumMakro(entries, 'fett'))} g ·
        Kohlenhydrate: {Math.round(sumMakro(entries, 'kohlenhydrate'))} g
      </p>
    </div>
  )
}

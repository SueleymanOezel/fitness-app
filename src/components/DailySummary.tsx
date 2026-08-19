import { sumKalorien } from '../lib/entry-calories'
import type { FoodEntry } from '../hooks/use-food-entries'

type Props = {
  entries: FoodEntry[]
  goal: number | null
}

function sumMakro(entries: FoodEntry[], makro: 'eiweiss' | 'fett' | 'kohlenhydrate'): number {
  return entries.reduce((total, entry) => {
    const value = entry.products?.[makro]
    if (value == null) return total
    return total + (value * entry.menge) / 100
  }, 0)
}

export default function DailySummary({ entries, goal }: Props) {
  const consumedExact = sumKalorien(entries)
  const consumed = Math.round(consumedExact)
  const remaining = goal != null ? Math.round(goal - consumedExact) : null

  return (
    <div>
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

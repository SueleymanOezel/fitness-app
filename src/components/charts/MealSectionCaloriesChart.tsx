import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { kalorienJeAbschnitt } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import type { MealSectionNames } from '../../lib/meal-sections'
import { KALORIEN_JE_ABSCHNITT_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = KALORIEN_JE_ABSCHNITT_TITEL

export default function MealSectionCaloriesChart({
  entries,
  profile,
  picker,
}: {
  entries: AnalysisFoodEntry[]
  profile: MealSectionNames | null
  picker?: ReactNode
}) {
  const punkte = profile ? kalorienJeAbschnitt(entries, profile) : []
  // Nicht punkte.length: die Funktion liefert immer einen Eintrag je
  // sichtbarem Abschnitt, auch mit 0 kcal. "Leer" heisst hier "kein
  // Abschnitt hat ueberhaupt etwas geloggt", nicht "kein Abschnitt existiert".
  const hatDaten = punkte.some((punkt) => punkt.kalorien > 0)

  return (
    <ChartFrame titel={TITEL} leer={!hatDaten} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kcal`, 'Kalorien']} />
          <Bar dataKey="kalorien" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

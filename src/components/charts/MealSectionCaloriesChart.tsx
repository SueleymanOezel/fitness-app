import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { kalorienJeAbschnitt } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import type { MealSectionNames } from '../../lib/meal-sections'
import { KALORIEN_JE_ABSCHNITT_TITEL } from '../../lib/analysis/chart-titles'
import { BEREICH_FARBE, achseProps, yAchseProps, gitterProps } from '../../lib/analysis/chart-colors'
import ChartFrame from './ChartFrame'

export const TITEL = KALORIEN_JE_ABSCHNITT_TITEL

export default function MealSectionCaloriesChart({
  entries,
  profile,
  picker,
  leerCta,
}: {
  entries: AnalysisFoodEntry[]
  profile: MealSectionNames | null
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = profile ? kalorienJeAbschnitt(entries, profile) : []
  // Nicht punkte.length: die Funktion liefert immer einen Eintrag je
  // sichtbarem Abschnitt, auch mit 0 kcal. "Leer" heisst hier "kein
  // Abschnitt hat ueberhaupt etwas geloggt", nicht "kein Abschnitt existiert".
  const hatDaten = punkte.some((punkt) => punkt.kalorien > 0)

  return (
    <ChartFrame titel={TITEL} leer={!hatDaten} leerHinweis="Erscheint mit dem ersten Eintrag im Zeitraum." picker={picker} leerCta={leerCta}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid {...gitterProps} />
          <XAxis {...achseProps} dataKey="name" />
          <YAxis {...yAchseProps} />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kcal`, 'Kalorien']} />
          {/* One color: the axis already names each section, and nutrition is orange. */}
          <Bar dataKey="kalorien" fill={BEREICH_FARBE.ernaehrung} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

import type { ReactNode } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { kalorienJeTag } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import { KALORIEN_PRO_TAG_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = KALORIEN_PRO_TAG_TITEL

/** `2026-08-24` → `24.08.` — the year is already implied by the range. */
function tagesLabel(tag: string) {
  const [, monat, tagesZahl] = tag.split('-')
  return `${tagesZahl}.${monat}.`
}

export default function CaloriesPerDayChart({
  entries,
  ziel,
  picker,
}: {
  entries: AnalysisFoodEntry[]
  ziel: number | null
  picker?: ReactNode
}) {
  const punkte = kalorienJeTag(entries).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.tag),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kcal`, 'Aufnahme']} />
          {ziel != null && (
            <ReferenceLine y={ziel} stroke="#82ca9d" label={`Ziel ${ziel} kcal`} />
          )}
          <Line type="monotone" dataKey="kalorien" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

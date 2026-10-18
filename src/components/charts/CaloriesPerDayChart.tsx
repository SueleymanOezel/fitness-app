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
import { tagesLabel } from '../../lib/analysis/tages-label'
import { CHART_GRID, CHART_MINT, achseProps, yAchseProps, gitterProps } from '../../lib/analysis/chart-colors'
import { tooltipZahl } from '../../lib/zahl'
import ChartFrame from './ChartFrame'

export const TITEL = KALORIEN_PRO_TAG_TITEL

export default function CaloriesPerDayChart({
  entries,
  ziel,
  picker,
  leerCta,
}: {
  entries: AnalysisFoodEntry[]
  ziel: number | null
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = kalorienJeTag(entries).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.tag),
  }))

  const schnitt = punkte.reduce((summe, punkt) => summe + punkt.kalorien, 0) / Math.max(punkte.length, 1)
  const zusammenfassung = `Ø ${Math.round(schnitt)} kcal pro Tag${ziel != null ? ` · Ziel ${ziel} kcal` : ''}`

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker} leerCta={leerCta} zusammenfassung={zusammenfassung}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid {...gitterProps} />
          <XAxis {...achseProps} dataKey="label" />
          <YAxis {...yAchseProps} />
          <Tooltip formatter={(wert?: ValueType) => [`${tooltipZahl(wert)} kcal`, 'Aufnahme']} />
          {ziel != null && (
            // ifOverflow="extendDomain": Recharts defaults to "discard" and
            // builds the y-axis domain only from reference lines that ask to
            // extend it. Without this the goal line silently disappears as
            // soon as the goal sits above the highest logged day — the exact
            // case this chart exists for.
            <ReferenceLine
              y={ziel}
              stroke={CHART_GRID}
              label={`Ziel ${ziel} kcal`}
              ifOverflow="extendDomain"
            />
          )}
          <Line type="monotone" dataKey="kalorien" stroke={CHART_MINT} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

import type { ReactNode } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { gewichtsTrend } from '../../lib/analysis/body-charts'
import type { BodyMetricRow } from '../../lib/body-metrics'
import { GEWICHTSVERLAUF_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import { BEREICH_FARBE, CHART_TEXT, achseProps, yAchseProps, gitterProps, ganzzahligeAchse } from '../../lib/analysis/chart-colors'
import ChartFrame from './ChartFrame'
import { tooltipZahl, zahlDe } from '../../lib/zahl'

export const TITEL = GEWICHTSVERLAUF_TITEL

export default function WeightTrendChart({
  rows,
  picker,
  leerCta,
}: {
  rows: BodyMetricRow[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = gewichtsTrend(rows).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.datum),
  }))

  const erster = punkte[0]
  const letzter = punkte[punkte.length - 1]
  const delta = letzter && erster ? letzter.gewicht - erster.gewicht : 0
  const zusammenfassung =
    punkte.length < 2
      ? undefined
      : `${zahlDe(letzter.gewicht, 1)} kg · ${delta === 0 ? '±' : delta < 0 ? '−' : '+'}${zahlDe(Math.abs(delta), 1)} kg seit ${erster.label}`

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker} leerCta={leerCta} zusammenfassung={zusammenfassung}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid {...gitterProps} />
          <XAxis {...achseProps} dataKey="label" />
          {/* The interesting range is a few kilos wide; a zero-based axis would
              flatten every change into a straight line. */}
          <YAxis {...yAchseProps} {...ganzzahligeAchse} />
          <Tooltip formatter={(wert?: ValueType) => [`${tooltipZahl(wert)} kg`, '']} />
          <Line type="monotone" dataKey="gewicht" name="Gewicht" stroke={CHART_TEXT} dot={false} />
          <Line type="monotone" dataKey="trend" name="Trend" stroke={BEREICH_FARBE.koerper} strokeWidth={2} dot={false} />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

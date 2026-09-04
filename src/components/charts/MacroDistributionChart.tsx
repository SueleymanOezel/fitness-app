import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { RenderableText } from 'recharts/types/component/Text'
import { makroAnteileHeute } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import { MAKRO_VERTEILUNG_HEUTE_TITEL } from '../../lib/analysis/chart-titles'
import { localDay } from '../../lib/local-time'
import ChartFrame from './ChartFrame'

export const TITEL = MAKRO_VERTEILUNG_HEUTE_TITEL

export default function MacroDistributionChart({
  entries,
  heute = localDay(new Date().toISOString()),
  picker,
}: {
  entries: AnalysisFoodEntry[]
  /** Ueberschreibbar fuer Tests; im echten Betrieb immer der heutige Tag. */
  heute?: string
  picker?: ReactNode
}) {
  const anteile = makroAnteileHeute(entries, heute)

  return (
    <ChartFrame titel={TITEL} leer={anteile.length < 1} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={anteile}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="makro" />
          <YAxis unit="%" />
          <Tooltip formatter={(wert?: ValueType) => [`${wert}%`, 'Anteil']} />
          {/* isAnimationActive={false}: LabelList only renders once Recharts'
              entrance animation reports itself finished (showLabels: !isAnimating
              in Bar.js) — with the default "auto" animation that flip happens on
              a later frame, so the gram labels would flash in after a delay (and
              never appear at all in a synchronous jsdom test). The label is the
              whole point of this bar, so it must be there from the first paint. */}
          <Bar dataKey="anteil" fill="#8884d8" isAnimationActive={false}>
            {/* Der Gramm-Wert, nicht der Energie-Anteil: die Balkenhoehe ist
                Energie, die Beschriftung bleibt in der vertrauten Einheit aus
                DailySummary. */}
            <LabelList dataKey="gramm" formatter={(value: RenderableText) => `${value} g`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSession } from '../../hooks/use-training-analysis'
import { dauerUndKalorien } from '../../lib/analysis/training-charts'
import { DAUER_UND_KALORIEN_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import { CHART_BLUE, CHART_MINT, achseProps, yAchseProps, gitterProps } from '../../lib/analysis/chart-colors'
import { tooltipZahl } from '../../lib/zahl'
import ChartFrame from './ChartFrame'

export const TITEL = DAUER_UND_KALORIEN_TITEL

/**
 * Two small charts on one time axis instead of one chart with two y-scales:
 * minutes and kcal differ by a factor of ten, and a dual axis lets the reader
 * compare heights that mean nothing against each other.
 */
export default function SessionLoadChart({
  sessions,
  picker,
  leerCta,
}: {
  sessions: AnalysisSession[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = dauerUndKalorien(sessions).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.tag),
  }))
  const mitKalorien = punkte.some((punkt) => punkt.kalorien != null)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} leerHinweis="Erscheint nach dem ersten abgeschlossenen Training." picker={picker} leerCta={leerCta}>
      <h3 className="text-sm font-medium text-text-muted">Minuten</h3>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={punkte} syncId="dauer-kalorien">
          <CartesianGrid {...gitterProps} />
          <XAxis {...achseProps} dataKey="label" />
          <YAxis {...yAchseProps} allowDecimals={false} />
          <Tooltip formatter={(wert?: ValueType) => [`${tooltipZahl(wert)} min`, 'Dauer']} />
          <Bar dataKey="minuten" name="Minuten" fill={CHART_MINT} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {mitKalorien && (
        <>
          <h3 className="text-sm font-medium text-text-muted">kcal</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={punkte} syncId="dauer-kalorien">
              <CartesianGrid {...gitterProps} />
              <XAxis {...achseProps} dataKey="label" />
              <YAxis {...yAchseProps} />
              <Tooltip formatter={(wert?: ValueType) => [`${tooltipZahl(wert)} kcal`, 'Verbrauch']} />
              <Line type="monotone" dataKey="kalorien" name="kcal" stroke={CHART_BLUE} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </ChartFrame>
  )
}

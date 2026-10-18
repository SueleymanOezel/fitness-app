import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { sessionsJeWoche } from '../../lib/analysis/training-charts'
import type { AnalysisSession } from '../../hooks/use-training-analysis'
import { TRAININGSFREQUENZ_TITEL } from '../../lib/analysis/chart-titles'
import { CHART_MINT, achseProps, yAchseProps, gitterProps } from '../../lib/analysis/chart-colors'
import { zahlDe } from '../../lib/zahl'
import ChartFrame from './ChartFrame'

export const TITEL = TRAININGSFREQUENZ_TITEL

export default function TrainingFrequencyChart({
  sessions,
  picker,
  leerCta,
}: {
  sessions: AnalysisSession[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = sessionsJeWoche(sessions)
  const gesamt = punkte.reduce((summe, punkt) => summe + punkt.anzahl, 0)
  const zusammenfassung =
    punkte.length === 1
      ? `${gesamt} ${gesamt === 1 ? 'Einheit' : 'Einheiten'} in ${punkte[0].woche}`
      : `Ø ${zahlDe(gesamt / Math.max(punkte.length, 1), 1)} Einheiten pro Woche`

  return (
    // Spec section 5: lines need two points, bars need one. A single bar still
    // states something ("3 Einheiten diese Woche"); a single line point does not.
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker} leerCta={leerCta} zusammenfassung={zusammenfassung}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid {...gitterProps} />
          <XAxis {...achseProps} dataKey="woche" />
          {/* allowDecimals: half a session does not exist. */}
          <YAxis {...yAchseProps} allowDecimals={false} />
          <Tooltip formatter={(wert?: ValueType) => [`${wert}`, 'Einheiten']} />
          <Bar dataKey="anzahl" fill={CHART_MINT} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

import type { ReactNode } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { makroVerlauf } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import { MAKRO_VERLAUF_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import { achseProps, yAchseProps, gitterProps } from '../../lib/analysis/chart-colors'
import { MAKRO_FARBEN, MAKRO_LABEL } from '../../lib/analysis/nutrition-charts'
import ChartFrame from './ChartFrame'

export const TITEL = MAKRO_VERLAUF_TITEL

export default function MacroTrendChart({
  entries,
  picker,
  leerCta,
}: {
  entries: AnalysisFoodEntry[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = makroVerlauf(entries).map((punkt) => ({ ...punkt, label: tagesLabel(punkt.tag) }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} leerHinweis="Erscheint ab zwei Tagen mit Einträgen." picker={picker} leerCta={leerCta}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid {...gitterProps} />
          <XAxis {...achseProps} dataKey="label" />
          <YAxis {...yAchseProps} unit=" g" />
          <Tooltip />
          <Line type="monotone" dataKey="eiweiss" name="Eiweiß (g)" stroke={MAKRO_FARBEN[MAKRO_LABEL.eiweiss]} dot={false} />
          <Line type="monotone" dataKey="fett" name="Fett (g)" stroke={MAKRO_FARBEN[MAKRO_LABEL.fett]} dot={false} />
          <Line
            type="monotone"
            dataKey="kohlenhydrate"
            name="Kohlenhydrate (g)"
            stroke={MAKRO_FARBEN[MAKRO_LABEL.kohlenhydrate]}
            dot={false}
          />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

import type { ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { UMFANG_FIELDS, umfaengeVerlauf, type UmfangFeld } from '../../lib/analysis/body-charts'
import { feldTeile, type BodyMetricRow } from '../../lib/body-metrics'
import { tooltipZahl, zahlDe } from '../../lib/zahl'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { UMFAENGE_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import { CHART_BLUE, CHART_GREEN, CHART_MINT, CHART_ORANGE, CHART_VIOLET, achseProps, yAchseProps, gitterProps } from '../../lib/analysis/chart-colors'
import ChartFrame from './ChartFrame'

export const TITEL = UMFAENGE_TITEL

/** Feste Farbe je Umfang: eine wechselnde Zuordnung waere zwischen zwei
 *  Zeitraeumen nicht wiedererkennbar. Reihenfolge exakt wie im Design-Spec
 *  (Bauch/Bein/Arm/Ruecken/Brust -> Mint/Blau/Gruen/Orange/Violett). */
const FARBEN: Record<UmfangFeld, string> = {
  bauchumfang: CHART_MINT,
  beinumfang: CHART_BLUE,
  armumfang: CHART_GREEN,
  ruckenumfang: CHART_ORANGE,
  brustumfang: CHART_VIOLET,
}

/**
 * One small chart per circumference (small multiples) instead of five lines on
 * one axis: 36 cm arm and 102 cm chest on a shared scale flatten every change
 * into a straight line. Each panel gets its own range and its latest value.
 */
export default function BodyMeasurementsChart({
  rows,
  picker,
  leerCta,
}: {
  rows: BodyMetricRow[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = umfaengeVerlauf(rows).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.datum),
  }))
  const felder = UMFANG_FIELDS.filter((feld) => punkte.some((punkt) => punkt[feld] != null))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker} leerCta={leerCta}>
      <div className="flex flex-col gap-4">
        {felder.map((feld) => {
          const { name, einheit } = feldTeile(feld)
          const letzter = [...punkte].reverse().find((punkt) => punkt[feld] != null)?.[feld]
          // One measurement draws no line; an empty frame would look like missing data.
          const messungen = punkte.filter((punkt) => punkt[feld] != null).length
          return (
            <section key={feld} className="flex flex-col gap-1">
              <h3 className="flex items-baseline justify-between text-sm font-medium text-text-muted">
                {name}
                {letzter != null && (
                  <span className="text-base font-semibold text-text tabular-nums">{`${zahlDe(letzter)} ${einheit}`}</span>
                )}
              </h3>
              {messungen < 2 ? (
                <p className="text-sm text-text-muted">Erst eine Messung.</p>
              ) : (
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={punkte}>
                    <CartesianGrid {...gitterProps} />
                    <XAxis {...achseProps} dataKey="label" />
                    <YAxis {...yAchseProps} domain={['auto', 'auto']} allowDecimals={false} tickCount={3} width={36} />
                    <Tooltip formatter={(wert?: ValueType) => [`${tooltipZahl(wert)} ${einheit}`, name]} />
                    <Line
                      type="monotone"
                      dataKey={feld}
                      name={name}
                      stroke={FARBEN[feld]}
                      strokeWidth={2}
                      dot={false}
                      // Wer den Bauch jede Woche misst und den Arm jeden Monat, hat
                      // Luecken in den Linien; ohne das zerfaellt jede in Stuecke.
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </section>
          )
        })}
      </div>
    </ChartFrame>
  )
}

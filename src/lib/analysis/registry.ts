// Titles come from ./chart-titles, not from the chart component modules
// directly: those modules import recharts, and this registry is reachable
// from ChartPicker, which every dashboard renders eagerly. Importing a title
// from a chart component here would pull recharts back into the entry bundle
// no matter how the components themselves are lazy-loaded at their use sites.
import {
  TRAININGSFREQUENZ_TITEL as TRAINING_FREQUENCY,
  KALORIEN_PRO_TAG_TITEL as CALORIES_PER_DAY,
  GEWICHTSVERLAUF_TITEL as WEIGHT_TREND,
} from './chart-titles'

export type Bereich = 'training' | 'nutrition' | 'body'

export type ChartDef = { id: string; bereich: Bereich; titel: string }

/**
 * The one truth about which charts exist and what they are called.
 *
 * It deliberately carries no component: the areas hand their charts different
 * props, and routing those through a shared `unknown` would cost type safety
 * for nothing. Pages embed the components; the registry answers "which ids
 * exist" for the picker and for validating the stored selection.
 */
export const CHARTS: ChartDef[] = [
  { id: 'T1', bereich: 'training', titel: TRAINING_FREQUENCY },
  { id: 'E1', bereich: 'nutrition', titel: CALORIES_PER_DAY },
  { id: 'K1', bereich: 'body', titel: WEIGHT_TREND },
]

export const CHART_IDS = CHARTS.map((chart) => chart.id)

export function chartsFor(bereich: Bereich): ChartDef[] {
  return CHARTS.filter((chart) => chart.bereich === bereich)
}

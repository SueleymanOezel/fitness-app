// Titles come from ./chart-titles, not from the chart component modules
// directly: those modules import recharts, and this registry is reachable
// from ChartPicker, which every dashboard renders eagerly. Importing a title
// from a chart component here would pull recharts back into the entry bundle
// no matter how the components themselves are lazy-loaded at their use sites.
import {
  TRAININGSFREQUENZ_TITEL as TRAINING_FREQUENCY,
  KRAFTVERLAUF_TITEL as STRENGTH,
  VOLUMEN_JE_UEBUNG_TITEL as EXERCISE_VOLUME,
  BESTES_SATZGEWICHT_TITEL as BEST_SET_WEIGHT,
  KALORIEN_PRO_TAG_TITEL as CALORIES_PER_DAY,
  MAKRO_VERTEILUNG_HEUTE_TITEL as MACRO_DISTRIBUTION_TODAY,
  MAKRO_VERLAUF_TITEL as MACRO_TREND,
  KALORIEN_JE_ABSCHNITT_TITEL as MEAL_SECTION_CALORIES,
  WOCHENSCHNITT_TITEL as WEEKLY_AVERAGE,
  GEWICHTSVERLAUF_TITEL as WEIGHT_TREND,
  WIEDERHOLUNGEN_JE_SATZ_TITEL as REPS_PER_SET,
  VOLUMEN_JE_MUSKELGRUPPE_TITEL as MUSCLE_VOLUME,
  DAUER_UND_KALORIEN_TITEL as SESSION_LOAD,
  REKORDE_TITEL as RECORDS,
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
/**
 * One id constant per chart, so the pages stop repeating string literals.
 *
 * Renaming an id in the registry then breaks the compile at the use site
 * instead of silently producing a checkbox that can never be ticked:
 * parseAuswahl would drop the stored id while `<ChartPicker id="T1">` kept
 * rendering the old one.
 */
export const T1 = 'T1'
export const T2 = 'T2'
export const T3 = 'T3'
export const T4 = 'T4'
export const T5 = 'T5'
export const T6 = 'T6'
export const T7 = 'T7'
export const T8 = 'T8'
export const E1 = 'E1'
export const E2 = 'E2'
export const E3 = 'E3'
export const E4 = 'E4'
export const E5 = 'E5'
export const K1 = 'K1'

export const CHARTS: ChartDef[] = [
  { id: T1, bereich: 'training', titel: TRAINING_FREQUENCY },
  { id: T2, bereich: 'training', titel: STRENGTH },
  { id: T3, bereich: 'training', titel: EXERCISE_VOLUME },
  { id: T4, bereich: 'training', titel: BEST_SET_WEIGHT },
  { id: T5, bereich: 'training', titel: REPS_PER_SET },
  { id: T6, bereich: 'training', titel: MUSCLE_VOLUME },
  { id: T7, bereich: 'training', titel: SESSION_LOAD },
  { id: T8, bereich: 'training', titel: RECORDS },
  { id: E1, bereich: 'nutrition', titel: CALORIES_PER_DAY },
  { id: E2, bereich: 'nutrition', titel: MACRO_DISTRIBUTION_TODAY },
  { id: E3, bereich: 'nutrition', titel: MACRO_TREND },
  { id: E4, bereich: 'nutrition', titel: MEAL_SECTION_CALORIES },
  { id: E5, bereich: 'nutrition', titel: WEEKLY_AVERAGE },
  { id: K1, bereich: 'body', titel: WEIGHT_TREND },
]

export const CHART_IDS = CHARTS.map((chart) => chart.id)

export function chartsFor(bereich: Bereich): ChartDef[] {
  return CHARTS.filter((chart) => chart.bereich === bereich)
}

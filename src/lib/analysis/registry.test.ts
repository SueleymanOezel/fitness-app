import { describe, expect, it } from 'vitest'
import * as registry from './registry'
import { CHARTS, CHART_IDS, chartsFor } from './registry'
import { TITEL as T1_TITEL } from '../../components/charts/TrainingFrequencyChart'
import { TITEL as T2_TITEL } from '../../components/charts/StrengthChart'
import { TITEL as T3_TITEL } from '../../components/charts/ExerciseVolumeChart'
import { TITEL as T4_TITEL } from '../../components/charts/BestSetWeightChart'
import { TITEL as T5_TITEL } from '../../components/charts/RepsPerSetChart'
import { TITEL as T6_TITEL } from '../../components/charts/MuscleVolumeChart'
import { TITEL as T7_TITEL } from '../../components/charts/SessionLoadChart'
import { TITEL as T8_TITEL } from '../../components/charts/PersonalRecordsList'
import { TITEL as E1_TITEL } from '../../components/charts/CaloriesPerDayChart'
import { TITEL as E2_TITEL } from '../../components/charts/MacroDistributionChart'
import { TITEL as K1_TITEL } from '../../components/charts/WeightTrendChart'

describe('registry', () => {
  it('registers the charts of plan 1 and 2a', () => {
    expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'K1'])
  })

  it('takes each title from its component instead of restating it', () => {
    // Two places for one title drift apart; the page would then label a chart
    // differently from the picker.
    expect(CHARTS.find((chart) => chart.id === 'T1')?.titel).toBe(T1_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'T2')?.titel).toBe(T2_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'T3')?.titel).toBe(T3_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'T4')?.titel).toBe(T4_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'T5')?.titel).toBe(T5_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'T6')?.titel).toBe(T6_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'T7')?.titel).toBe(T7_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'T8')?.titel).toBe(T8_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'E1')?.titel).toBe(E1_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'E2')?.titel).toBe(E2_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'K1')?.titel).toBe(K1_TITEL)
  })

  it('filters by area', () => {
    expect(chartsFor('training').map((chart) => chart.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
    expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2'])
    expect(chartsFor('body').map((chart) => chart.id)).toEqual(['K1'])
  })

  it('exports an id constant for every registered chart', () => {
    // The pages use these constants instead of string literals. If one drifts
    // from the registry, parseAuswahl would drop the stored id while the
    // picker still renders the old one: a checkbox that can never be ticked.
    const konstanten = Object.entries(registry).filter(([, wert]) => typeof wert === 'string')
    for (const [name, wert] of konstanten) {
      expect(CHART_IDS).toContain(wert)
      expect(wert).toBe(name) // the constant is named after the id it carries
    }
    expect(konstanten.map(([, wert]) => wert).sort()).toEqual([...CHART_IDS].sort())
  })

  it('has no duplicate ids', () => {
    // The selection is a list of ids; a duplicate would make un-pinning
    // ambiguous.
    expect(new Set(CHART_IDS).size).toBe(CHART_IDS.length)
  })
})

import { describe, expect, it } from 'vitest'
import { CHARTS, CHART_IDS, chartsFor } from './registry'
import { TITEL as T1_TITEL } from '../../components/charts/TrainingFrequencyChart'
import { TITEL as E1_TITEL } from '../../components/charts/CaloriesPerDayChart'
import { TITEL as K1_TITEL } from '../../components/charts/WeightTrendChart'

describe('registry', () => {
  it('registers the three charts of plan 1', () => {
    expect(CHART_IDS).toEqual(['T1', 'E1', 'K1'])
  })

  it('takes each title from its component instead of restating it', () => {
    // Two places for one title drift apart; the page would then label a chart
    // differently from the picker.
    expect(CHARTS.find((chart) => chart.id === 'T1')?.titel).toBe(T1_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'E1')?.titel).toBe(E1_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'K1')?.titel).toBe(K1_TITEL)
  })

  it('filters by area', () => {
    expect(chartsFor('training').map((chart) => chart.id)).toEqual(['T1'])
    expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1'])
    expect(chartsFor('body').map((chart) => chart.id)).toEqual(['K1'])
  })

  it('has no duplicate ids', () => {
    // The selection is a list of ids; a duplicate would make un-pinning
    // ambiguous.
    expect(new Set(CHART_IDS).size).toBe(CHART_IDS.length)
  })
})

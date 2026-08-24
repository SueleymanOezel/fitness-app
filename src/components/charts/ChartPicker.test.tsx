import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import ChartPicker, { useChartSelection } from './ChartPicker'

const updateProfile = vi.fn()
const profil = { analyse_auswahl: ['T1'] }

vi.mock('../../hooks/use-profile', () => ({
  useProfile: () => ({ profile: profil, loading: false, error: false, updateProfile }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  updateProfile.mockResolvedValue(undefined)
  profil.analyse_auswahl = ['T1']
})

describe('useChartSelection', () => {
  it('reads the stored selection', () => {
    const { result } = renderHook(() => useChartSelection('u1'))
    expect(result.current.istGewaehlt('T1')).toBe(true)
    expect(result.current.istGewaehlt('K1')).toBe(false)
  })

  it('drops ids that no longer answer to a chart', () => {
    profil.analyse_auswahl = ['T1', 'T99']
    const { result } = renderHook(() => useChartSelection('u1'))
    expect(result.current.auswahl).toEqual(['T1'])
  })

  it('writes the new list to the profile', async () => {
    const { result } = renderHook(() => useChartSelection('u1'))
    await result.current.umschalten('K1')
    expect(updateProfile).toHaveBeenCalledWith({ analyse_auswahl: ['T1', 'K1'] })
  })

  it('keeps both ids when two boxes are ticked inside one round-trip', async () => {
    // Plan 2 puts eight checkboxes on one analysis page. Computing the next
    // list from the `auswahl` captured at render time makes the second tick
    // build on the same stale list, so its write erases the first one.
    const { result } = renderHook(() => useChartSelection('u1'))
    await act(async () => {
      await Promise.all([result.current.umschalten('K1'), result.current.umschalten('E1')])
    })
    expect(updateProfile).toHaveBeenLastCalledWith({ analyse_auswahl: ['T1', 'K1', 'E1'] })
  })

  it('reports a failed write instead of pretending it stuck', async () => {
    // Without this the checkbox would flip back on the next load with no
    // explanation.
    updateProfile.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useChartSelection('u1'))
    await result.current.umschalten('K1')
    await waitFor(() => expect(result.current.fehler).not.toBe(''))
  })
})

describe('ChartPicker', () => {
  it('renders a checked box for a pinned chart', () => {
    const { result } = renderHook(() => useChartSelection('u1'))
    render(<ChartPicker id="T1" auswahl={result.current} />)
    expect(screen.getByRole('checkbox', { name: 'Auf dem Dashboard zeigen' })).toBeChecked()
  })

  it('toggles on click', async () => {
    const { result } = renderHook(() => useChartSelection('u1'))
    render(<ChartPicker id="K1" auswahl={result.current} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Auf dem Dashboard zeigen' }))
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ analyse_auswahl: ['T1', 'K1'] }))
  })
})

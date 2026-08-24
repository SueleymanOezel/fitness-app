import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
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

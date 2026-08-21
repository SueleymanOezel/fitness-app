import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

const profile = {
  id: 'u1',
  name: 'Test',
  alter: 30,
  groesse: 180,
  aktuelles_gewicht: 80,
  geschlecht: 'maennlich' as const,
  aktivitaetslevel: 'moderat' as const,
  ziel: 'halten' as const,
  ziel_delta_kcal: 500,
  taegliches_kalorienziel: null,
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
}

function profileResult(overrides: Record<string, unknown> = {}) {
  return {
    profile,
    loading: false,
    error: false,
    reload: vi.fn(),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

async function renderPage(result = profileResult()) {
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseProfile.mockReturnValue(result)
  const { default: ProfilePage } = await import('./ProfilePage')
  render(<ProfilePage />)
  return result
}

describe('ProfilePage', () => {
  it('fills the form with the stored profile', async () => {
    await renderPage()

    expect(screen.getByLabelText('Name')).toHaveValue('Test')
    expect(screen.getByLabelText('Alter (Jahre)')).toHaveValue(30)
    expect(screen.getByLabelText('Größe (cm)')).toHaveValue(180)
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(80)
    expect(screen.getByLabelText('Geschlecht')).toHaveValue('maennlich')
    expect(screen.getByLabelText('Aktivitätslevel')).toHaveValue('moderat')
    expect(screen.getByLabelText('Ziel')).toHaveValue('halten')
    expect(screen.getByLabelText('Ziel-Delta (kcal)')).toHaveValue(500)
  })

  it('writes every field in a single update when saving', async () => {
    const result = await renderPage()

    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '78' } })
    fireEvent.change(screen.getByLabelText('Ziel'), { target: { value: 'abnehmen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(result.updateProfile).toHaveBeenCalledTimes(1))
    expect(result.updateProfile).toHaveBeenCalledWith({
      name: 'Test',
      alter: 30,
      groesse: 180,
      aktuelles_gewicht: 78,
      geschlecht: 'maennlich',
      aktivitaetslevel: 'moderat',
      ziel: 'abnehmen',
      ziel_delta_kcal: 500,
      mahlzeit_1_name: 'Frühstück',
      mahlzeit_2_name: 'Mittagessen',
      mahlzeit_3_name: 'Abendessen',
      mahlzeit_4_name: 'Snacks',
      mahlzeit_5_name: null,
      mahlzeit_6_name: null,
    })
  })

  it('does not save while a field is being retyped', async () => {
    const result = await renderPage()

    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '7' } })
    fireEvent.blur(screen.getByLabelText('Gewicht (kg)'))

    expect(result.updateProfile).not.toHaveBeenCalled()
  })

  it('rejects an implausible weight instead of storing it', async () => {
    const result = await renderPage()

    // A typo here would silently produce an absurd calorie goal.
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '800' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('plausible Werte')
    expect(result.updateProfile).not.toHaveBeenCalled()
  })

  it('rejects an implausible age instead of storing it', async () => {
    const result = await renderPage()

    fireEvent.change(screen.getByLabelText('Alter (Jahre)'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('plausible Werte')
    expect(result.updateProfile).not.toHaveBeenCalled()
  })

  it('confirms a successful save', async () => {
    await renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Gespeichert'))
  })

  it('reports a failed save instead of looking successful', async () => {
    await renderPage(profileResult({ updateProfile: vi.fn().mockRejectedValue(new Error('nope')) }))

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('konnte nicht gespeichert werden'),
    )
  })

  it('offers a retry when the profile cannot be loaded', async () => {
    const result = await renderPage(profileResult({ profile: null, error: true }))

    expect(screen.getByRole('alert')).toHaveTextContent('konnte nicht geladen werden')
    screen.getByRole('button', { name: 'Erneut versuchen' }).click()
    expect(result.reload).toHaveBeenCalled()
  })

  it('shows the calorie goal editor', async () => {
    await renderPage()

    expect(screen.getByText(/Berechnetes Tagesziel/)).toBeInTheDocument()
  })

  it('shows the meal section names', async () => {
    await renderPage()

    expect(screen.getByLabelText('Mahlzeit 1')).toHaveValue('Frühstück')
    expect(screen.getByLabelText('Mahlzeit 4')).toHaveValue('Snacks')
    expect(screen.getByLabelText('Mahlzeit 5')).toHaveValue('')
  })

  it('saves renamed and newly added sections', async () => {
    const result = await renderPage()

    fireEvent.change(screen.getByLabelText('Mahlzeit 4'), { target: { value: 'Zwischenmahlzeit' } })
    fireEvent.change(screen.getByLabelText('Mahlzeit 5'), { target: { value: 'Spätmahlzeit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(result.updateProfile).toHaveBeenCalled())
    expect(result.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        mahlzeit_4_name: 'Zwischenmahlzeit',
        mahlzeit_5_name: 'Spätmahlzeit',
        mahlzeit_6_name: null,
      }),
    )
  })

  it('restores the default when a preset section name is cleared', async () => {
    const result = await renderPage()

    // The column is NOT NULL — an empty title would be rejected by the database,
    // and a rejected save is a worse answer than putting the default back.
    fireEvent.change(screen.getByLabelText('Mahlzeit 1'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(result.updateProfile).toHaveBeenCalled())
    expect(result.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ mahlzeit_1_name: 'Frühstück' }),
    )
  })

  it('caps a section name at 40 characters', async () => {
    const result = await renderPage()

    fireEvent.change(screen.getByLabelText('Mahlzeit 5'), { target: { value: 'x'.repeat(60) } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(result.updateProfile).toHaveBeenCalled())
    expect(result.updateProfile.mock.calls[0][0].mahlzeit_5_name).toHaveLength(40)
  })
})

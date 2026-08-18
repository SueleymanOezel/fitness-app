import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockDecodeFromVideoDevice = vi.fn()
const mockStop = vi.fn()

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
    decodeFromVideoDevice: mockDecodeFromVideoDevice,
  })),
}))

describe('BarcodeScanner', () => {
  beforeEach(() => {
    mockDecodeFromVideoDevice.mockReset()
    mockStop.mockReset()
  })

  it('calls onDetected when a barcode is decoded', async () => {
    mockDecodeFromVideoDevice.mockImplementation((_deviceId, _video, callback) => {
      callback({ getText: () => '4001234567890' })
      return Promise.resolve({ stop: mockStop })
    })

    const { default: BarcodeScanner } = await import('./BarcodeScanner')
    const onDetected = vi.fn()
    render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />)

    await waitFor(() => expect(onDetected).toHaveBeenCalledWith('4001234567890'))
  })

  it('shows an error message when the camera fails to start', async () => {
    mockDecodeFromVideoDevice.mockRejectedValue(new Error('permission denied'))

    const { default: BarcodeScanner } = await import('./BarcodeScanner')
    render(<BarcodeScanner onDetected={vi.fn()} onClose={vi.fn()} />)

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Kamera konnte nicht gestartet werden'),
    )
  })

  it('calls onClose when the cancel button is clicked', async () => {
    mockDecodeFromVideoDevice.mockResolvedValue({ stop: mockStop })

    const { default: BarcodeScanner } = await import('./BarcodeScanner')
    const onClose = vi.fn()
    render(<BarcodeScanner onDetected={vi.fn()} onClose={onClose} />)

    screen.getByRole('button', { name: 'Abbrechen' }).click()

    expect(onClose).toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
const mockUpload = vi.fn()
const mockRemove = vi.fn()
const mockCreateSignedUrls = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
        createSignedUrls: mockCreateSignedUrls,
      }),
    },
  },
}))

// jsdom has no canvas, so the resize step is replaced wholesale.
vi.mock('../lib/image-resize', () => ({
  resizeToJpeg: vi.fn(() => Promise.resolve(new Blob(['x'], { type: 'image/jpeg' }))),
}))

const rows = [{ id: 'p1', datum: '2026-08-24', foto_url: 'u1/abc.jpg' }]

beforeEach(() => {
  vi.clearAllMocks()
  mockUpload.mockResolvedValue({ error: null })
  mockRemove.mockResolvedValue({ error: null })
  mockCreateSignedUrls.mockResolvedValue({
    data: [{ path: 'u1/abc.jpg', signedUrl: 'https://signed.example/abc' }],
    error: null,
  })
})

const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })

describe('useBodyPhotos', () => {
  it('loads the photos and pairs each with a signed link', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: rows }))

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.photos).toEqual([
      { id: 'p1', datum: '2026-08-24', pfad: 'u1/abc.jpg', url: 'https://signed.example/abc' },
    ])
  })

  it('stores the file under the user folder so the policy accepts it', async () => {
    const builder = createQueryBuilder({ data: rows })
    mockFrom.mockReturnValue(builder)

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.uploadPhoto(file, '2026-08-24')

    // The storage policy checks the first path segment against auth.uid().
    expect(mockUpload.mock.calls[0][0]).toMatch(/^u1\//)
  })

  it('removes the uploaded file again when the row cannot be written', async () => {
    // Otherwise a file nobody can see keeps occupying the quota.
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.uploadPhoto(file, '2026-08-24')).rejects.toThrow()
    expect(mockRemove).toHaveBeenCalled()
  })

  it('writes no row when the upload itself fails', async () => {
    const builder = createQueryBuilder({ data: rows })
    mockFrom.mockReturnValue(builder)
    mockUpload.mockResolvedValue({ error: { message: 'boom' } })

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.uploadPhoto(file, '2026-08-24')).rejects.toThrow()
    expect(builder.insert).not.toHaveBeenCalled()
  })

  it('deletes the file before the row, so a retry is harmless', async () => {
    const builder = createQueryBuilder({ data: [] })
    mockFrom.mockReturnValue(builder)
    const order: string[] = []
    mockRemove.mockImplementation(() => {
      order.push('file')
      return Promise.resolve({ error: null })
    })
    builder.delete = vi.fn(() => {
      order.push('row')
      return builder
    })

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.deletePhoto({ id: 'p1', datum: '2026-08-24', pfad: 'u1/abc.jpg', url: null })

    expect(order).toEqual(['file', 'row'])
  })

  it('keeps the row when the file could not be deleted', async () => {
    const builder = createQueryBuilder({ data: [] })
    mockFrom.mockReturnValue(builder)
    mockRemove.mockResolvedValue({ error: { message: 'boom' } })

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      result.current.deletePhoto({ id: 'p1', datum: '2026-08-24', pfad: 'u1/abc.jpg', url: null }),
    ).rejects.toThrow()
    expect(builder.delete).not.toHaveBeenCalled()
  })
})

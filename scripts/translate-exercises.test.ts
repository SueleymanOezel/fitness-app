import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTranslationUpdate, collectUniqueStrings, createDeeplTranslateBatch } from './translate-exercises.ts'

describe('collectUniqueStrings', () => {
  it('collects each unique name and instruction sentence exactly once', () => {
    const exercises = [
      { name: 'Push Up', anleitung: ['Get in position.', 'Push up and down.'] },
      { name: 'Sit Up', anleitung: ['Get in position.', 'Sit up.'] },
    ]

    const strings = collectUniqueStrings(exercises)

    expect(strings).toHaveLength(5)
    expect(new Set(strings)).toEqual(
      new Set(['Push Up', 'Sit Up', 'Get in position.', 'Push up and down.', 'Sit up.']),
    )
  })

  it('collects only the name when anleitung is null', () => {
    const strings = collectUniqueStrings([{ name: 'X', anleitung: null }])
    expect(strings).toEqual(['X'])
  })

  it('returns an empty array for an empty list', () => {
    expect(collectUniqueStrings([])).toEqual([])
  })
})

describe('buildTranslationUpdate', () => {
  const translations = new Map([
    ['Push Up', 'Liegestütz'],
    ['Get in position.', 'Geh in Position.'],
    ['Push up and down.', 'Drücke hoch und runter.'],
  ])

  it('sets name_de and anleitung_de when every string has a translation', () => {
    const update = buildTranslationUpdate(
      { id: 'e1', name: 'Push Up', anleitung: ['Get in position.', 'Push up and down.'] },
      translations,
    )

    expect(update).toEqual({
      id: 'e1',
      name_de: 'Liegestütz',
      anleitung_de: ['Geh in Position.', 'Drücke hoch und runter.'],
    })
  })

  it('sets anleitung_de to null when the exercise has no anleitung', () => {
    const update = buildTranslationUpdate({ id: 'e1', name: 'Push Up', anleitung: null }, translations)
    expect(update).toEqual({ id: 'e1', name_de: 'Liegestütz', anleitung_de: null })
  })

  it('leaves anleitung_de null when not every sentence has a translation', () => {
    // "Sit up." is missing from the translations map — a resumable run must
    // not write a partly-German, partly-English array.
    const update = buildTranslationUpdate(
      { id: 'e1', name: 'Push Up', anleitung: ['Get in position.', 'Sit up.'] },
      translations,
    )

    expect(update).toEqual({ id: 'e1', name_de: 'Liegestütz', anleitung_de: null })
  })

  it('returns null when the name itself has no translation', () => {
    // Happens only if a batch failed before this name was translated — the
    // row is skipped entirely and retried on the next script run.
    const update = buildTranslationUpdate({ id: 'e1', name: 'Untranslated', anleitung: null }, translations)
    expect(update).toBeNull()
  })
})

import { QuotaExceededError, runTranslation } from './translate-exercises.ts'

type Row = { id: string; name: string; anleitung: string[] | null }

function createClient(rows: Row[]) {
  const updates: { id: string; name_de: string; anleitung_de: string[] | null }[] = []
  let capturedFilter = ''
  return {
    updates,
    get capturedFilter() {
      return capturedFilter
    },
    from: () => ({
      select: () => ({
        is: () => ({
          or: (filter: string) => {
            capturedFilter = filter
            return {
              range: async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }),
            }
          },
        }),
      }),
      update: (values: { name_de: string; anleitung_de: string[] | null }) => ({
        eq: async (_column: string, id: string) => {
          updates.push({ id, ...values })
          return { error: null }
        },
      }),
    }),
  }
}

describe('createDeeplTranslateBatch', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends formality and source_lang alongside target_lang', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ translations: [{ text: 'Liegestütz' }] }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const translateBatch = createDeeplTranslateBatch('key')
    const result = await translateBatch(['Push Up'])

    expect(result).toEqual(['Liegestütz'])
    const [, requestInit] = fetchMock.mock.calls[0] as unknown as [string, { body: string }]
    const body = JSON.parse(requestInit.body)
    expect(body).toEqual({
      text: ['Push Up'],
      target_lang: 'DE',
      formality: 'prefer_less',
      source_lang: 'EN',
    })
  })

  it('throws when DeepL returns fewer translations than texts requested', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ translations: [{ text: 'Liegestütz' }] }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const translateBatch = createDeeplTranslateBatch('key')

    await expect(translateBatch(['Push Up', 'Sit Up'])).rejects.toThrow(
      'DeepL returned 1 translations for 2 requested texts',
    )
  })
})

describe('runTranslation', () => {
  it('reads untranslated rows with the expected filter, translates unique strings once, and writes name_de/anleitung_de back', async () => {
    const rows: Row[] = [
      { id: 'e1', name: 'Push Up', anleitung: ['Get in position.', 'Push up and down.'] },
      { id: 'e2', name: 'Sit Up', anleitung: ['Get in position.', 'Sit up.'] },
    ]
    const client = createClient(rows)
    const translateBatch = vi.fn(async (texts: string[]) => texts.map((text) => `${text} DE`))

    const result = await runTranslation(client, translateBatch)

    expect(client.capturedFilter).toBe('name_de.is.null,and(anleitung.not.is.null,anleitung_de.is.null)')
    // 5 unique strings across the two rows ("Get in position." shared) — one batch.
    expect(translateBatch).toHaveBeenCalledTimes(1)
    expect(translateBatch.mock.calls[0][0]).toHaveLength(5)
    expect(client.updates).toEqual([
      { id: 'e1', name_de: 'Push Up DE', anleitung_de: ['Get in position. DE', 'Push up and down. DE'] },
      { id: 'e2', name_de: 'Sit Up DE', anleitung_de: ['Get in position. DE', 'Sit up. DE'] },
    ])
    expect(result).toEqual({ updated: 2, total: 2, quotaExceeded: false })
  })

  it('stops translating further batches on a quota error, but keeps and writes what was already translated', async () => {
    // 51 unique names split into a 50-item batch and a 1-item batch.
    const rows: Row[] = Array.from({ length: 51 }, (_, index) => ({ id: `e${index}`, name: `Ex${index}`, anleitung: null }))
    const client = createClient(rows)
    const translateBatch = vi
      .fn<(texts: string[]) => Promise<string[]>>()
      .mockImplementationOnce(async (texts) => texts.map((text) => `${text} DE`))
      .mockImplementationOnce(async () => {
        throw new QuotaExceededError('quota exceeded')
      })

    const result = await runTranslation(client, translateBatch)

    expect(translateBatch).toHaveBeenCalledTimes(2)
    expect(client.updates).toHaveLength(50)
    expect(client.updates.map((update) => update.id)).not.toContain('e50')
    expect(result).toEqual({ updated: 50, total: 51, quotaExceeded: true })
  })

  it('re-throws a non-quota translation error instead of treating it as a clean stop', async () => {
    const rows: Row[] = [{ id: 'e1', name: 'Push Up', anleitung: null }]
    const client = createClient(rows)
    const translateBatch = vi.fn(async () => {
      throw new Error('network down')
    })

    await expect(runTranslation(client, translateBatch)).rejects.toThrow('network down')
    expect(client.updates).toHaveLength(0)
  })

  it('pages through more than one page of untranslated rows', async () => {
    const rows: Row[] = Array.from({ length: 700 }, (_, index) => ({ id: `e${index}`, name: `Ex${index}`, anleitung: null }))
    const client = createClient(rows)
    const translateBatch = vi.fn(async (texts: string[]) => texts.map((text) => `${text} DE`))

    const result = await runTranslation(client, translateBatch)

    expect(client.updates).toHaveLength(700)
    expect(result).toEqual({ updated: 700, total: 700, quotaExceeded: false })
  })
})

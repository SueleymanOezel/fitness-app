import { describe, expect, it } from 'vitest'
import { buildTranslationUpdate, collectUniqueStrings } from './translate-exercises.ts'

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

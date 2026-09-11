import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export function collectUniqueStrings(exercises: { name: string; anleitung: string[] | null }[]): string[] {
  const strings = new Set<string>()
  for (const exercise of exercises) {
    strings.add(exercise.name)
    for (const satz of exercise.anleitung ?? []) strings.add(satz)
  }
  return [...strings]
}

export type TranslationUpdate = { id: string; name_de: string; anleitung_de: string[] | null }

export function buildTranslationUpdate(
  exercise: { id: string; name: string; anleitung: string[] | null },
  translations: Map<string, string>,
): TranslationUpdate | null {
  const nameDe = translations.get(exercise.name)
  if (nameDe === undefined) return null

  let anleitungDe: string[] | null = null
  if (exercise.anleitung !== null) {
    const translated = exercise.anleitung.map((satz) => translations.get(satz))
    anleitungDe = translated.every((satz): satz is string => satz !== undefined) ? (translated as string[]) : null
  }

  return { id: exercise.id, name_de: nameDe, anleitung_de: anleitungDe }
}

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'
const TRANSLATE_BATCH_SIZE = 50
/** Same db-max-rows cap as import-exercises.ts: an unpaged read would silently stop at 1000 rows. */
const READ_PAGE_SIZE = 500
/** Only rows still missing some translation — makes the script resumable across months/quota resets. */
const UNTRANSLATED_FILTER = 'name_de.is.null,and(anleitung.not.is.null,anleitung_de.is.null)'

export class QuotaExceededError extends Error {}

type ExerciseRow = { id: string; name: string; anleitung: string[] | null }

type ReadResult = PromiseLike<{ data: ExerciseRow[] | null; error: { message: string } | null }>
type WriteResult = PromiseLike<{ error: { message: string } | null }>

type TranslateClient = {
  from: (table: string) => {
    select: (columns: string) => {
      is: (column: string, value: null) => {
        or: (filter: string) => { range: (from: number, to: number) => ReadResult }
      }
    }
    update: (values: { name_de: string; anleitung_de: string[] | null }) => {
      eq: (column: string, value: string) => WriteResult
    }
  }
}

export type TranslateBatchFn = (texts: string[]) => Promise<string[]>

async function loadUntranslated(client: TranslateClient): Promise<ExerciseRow[]> {
  const all: ExerciseRow[] = []
  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const { data, error } = await client
      .from('exercises')
      .select('id, name, anleitung')
      .is('created_by', null)
      .or(UNTRANSLATED_FILTER)
      .range(from, from + READ_PAGE_SIZE - 1)
    if (error) throw new Error(`translate failed while reading untranslated rows: ${error.message}`)
    const page = data ?? []
    all.push(...page)
    if (page.length < READ_PAGE_SIZE) break
  }
  return all
}

async function writeTranslation(client: TranslateClient, update: TranslationUpdate) {
  const { error } = await client
    .from('exercises')
    .update({ name_de: update.name_de, anleitung_de: update.anleitung_de })
    .eq('id', update.id)
  if (error) throw new Error(`translate failed while writing row ${update.id}: ${error.message}`)
}

/**
 * Batches are translated in order and stop cleanly on a quota error — rows
 * whose strings were already translated are still written, the rest is
 * simply left null for the next run (see buildTranslationUpdate).
 */
export async function runTranslation(
  client: TranslateClient,
  translateBatch: TranslateBatchFn,
): Promise<{ updated: number; total: number; quotaExceeded: boolean }> {
  const rows = await loadUntranslated(client)
  const strings = collectUniqueStrings(rows)

  const translations = new Map<string, string>()
  let quotaExceeded = false
  for (let from = 0; from < strings.length; from += TRANSLATE_BATCH_SIZE) {
    const batch = strings.slice(from, from + TRANSLATE_BATCH_SIZE)
    try {
      const translated = await translateBatch(batch)
      batch.forEach((text, index) => translations.set(text, translated[index]))
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        quotaExceeded = true
        break
      }
      throw error
    }
  }

  let updated = 0
  for (const row of rows) {
    const update = buildTranslationUpdate(row, translations)
    if (update === null) continue
    await writeTranslation(client, update)
    updated += 1
  }
  return { updated, total: rows.length, quotaExceeded }
}

export function createDeeplTranslateBatch(apiKey: string): TranslateBatchFn {
  return async (texts) => {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts, target_lang: 'DE', formality: 'prefer_less', source_lang: 'EN' }),
    })
    if (response.status === 456) throw new QuotaExceededError('DeepL monthly character quota exceeded')
    if (!response.ok) throw new Error(`DeepL request failed: ${response.status} ${response.statusText}`)
    const body = (await response.json()) as { translations: { text: string }[] }
    if (body.translations.length !== texts.length) {
      throw new Error(`DeepL returned ${body.translations.length} translations for ${texts.length} requested texts`)
    }
    return body.translations.map((translation) => translation.text)
  }
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const deeplApiKey = process.env.DEEPL_API_KEY
  if (!url || !serviceRoleKey || !deeplApiKey) {
    throw new Error('Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEEPL_API_KEY before running this script.')
  }

  const supabase = createClient(url, serviceRoleKey)
  const { updated, total, quotaExceeded } = await runTranslation(
    supabase as unknown as TranslateClient,
    createDeeplTranslateBatch(deeplApiKey),
  )

  if (quotaExceeded) {
    console.log(`translated ${updated} of ${total} exercises — DeepL monthly quota exceeded, re-run next month for the rest`)
  } else {
    console.log(`translated ${updated} of ${total} exercises`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}

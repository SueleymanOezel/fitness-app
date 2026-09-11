import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

/**
 * The full 873-exercise dataset contains exactly these four imperial-unit
 * phrasings (checked against scripts/free-exercise-db.json) — a generic
 * lb/kg parser would be speculative for a closed, static dataset.
 */
const IMPERIAL_REPLACEMENTS: [RegExp, string][] = [
  [/\b5-10 lbs\b/g, '2-5 kg'],
  [/\b25-lb ones\b/g, '11-kg ones'],
  [/\b35-45lb ones\b/g, '16-20 kg ones'],
  [/\b150 lb\b/g, '68 kg'],
]

export function convertImperialUnits(text: string): string {
  return IMPERIAL_REPLACEMENTS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text)
}

export type ImperialFixUpdate = { id: string; anleitung: string[] }

export function buildImperialFixUpdate(exercise: { id: string; anleitung: string[] | null }): ImperialFixUpdate | null {
  const anleitung = exercise.anleitung
  if (anleitung === null) return null

  const converted = anleitung.map(convertImperialUnits)
  const changed = converted.some((satz, index) => satz !== anleitung[index])
  if (!changed) return null

  return { id: exercise.id, anleitung: converted }
}

const READ_PAGE_SIZE = 500

type ExerciseRow = { id: string; anleitung: string[] | null }
type ReadResult = PromiseLike<{ data: ExerciseRow[] | null; error: { message: string } | null }>
type WriteResult = PromiseLike<{ error: { message: string } | null }>

type FixClient = {
  from: (table: string) => {
    select: (columns: string) => {
      is: (column: string, value: null) => { range: (from: number, to: number) => ReadResult }
    }
    update: (values: { anleitung: string[]; anleitung_de: null }) => {
      eq: (column: string, value: string) => WriteResult
    }
  }
}

async function loadExercises(client: FixClient): Promise<ExerciseRow[]> {
  const all: ExerciseRow[] = []
  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const { data, error } = await client
      .from('exercises')
      .select('id, anleitung')
      .is('created_by', null)
      .range(from, from + READ_PAGE_SIZE - 1)
    if (error) throw new Error(`fix-imperial-units failed while reading rows: ${error.message}`)
    const page = data ?? []
    all.push(...page)
    if (page.length < READ_PAGE_SIZE) break
  }
  return all
}

/**
 * Updates only the exercises table (anleitung + a reset anleitung_de) —
 * never re-imports, since exercise ids are now referenced by
 * workout_plan_day_exercises for real users (see import-exercises.ts).
 * Run translate-exercises.ts afterwards to regenerate the just-reset
 * German translations for the corrected sentences.
 */
export async function runImperialFix(client: FixClient): Promise<{ updated: number; total: number }> {
  const rows = await loadExercises(client)

  let updated = 0
  for (const row of rows) {
    const update = buildImperialFixUpdate(row)
    if (update === null) continue
    const { error } = await client
      .from('exercises')
      .update({ anleitung: update.anleitung, anleitung_de: null })
      .eq('id', update.id)
    if (error) throw new Error(`fix-imperial-units failed while writing row ${update.id}: ${error.message}`)
    updated += 1
  }
  return { updated, total: rows.length }
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.')
  }

  const supabase = createClient(url, serviceRoleKey)
  const { updated, total } = await runImperialFix(supabase as unknown as FixClient)
  console.log(`fixed imperial units in ${updated} of ${total} exercises — run translate-exercises next to retranslate them`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}

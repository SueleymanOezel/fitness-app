import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { metForCategory } from '../src/lib/met-categories.ts'

const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

type RawExercise = {
  name: string
  category: string
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  images: string[]
}

export function toExerciseRow(raw: RawExercise) {
  return {
    name: raw.name,
    kategorie: raw.category,
    equipment: raw.equipment,
    muskelgruppen_primaer: raw.primaryMuscles,
    muskelgruppen_sekundaer: raw.secondaryMuscles,
    bild_url: raw.images.length > 0 ? `${IMAGE_BASE_URL}${raw.images[0]}` : null,
    met_wert: metForCategory(raw.category),
    created_by: null,
  }
}

type ExerciseRow = ReturnType<typeof toExerciseRow>

type ReadResult = PromiseLike<{ data: { id: string }[] | null; error: { message: string } | null }>

type ImportClient = {
  from: (table: string) => {
    select: (columns: string) => {
      is: (column: string, value: null) => { range: (from: number, to: number) => ReadResult }
    }
    insert: (rows: ExerciseRow[]) => PromiseLike<{ error: { message: string } | null }>
    delete: () => { in: (column: string, values: string[]) => PromiseLike<{ error: { message: string } | null }> }
  }
}

/** Same db-max-rows cap as the app: an unpaged read would silently stop at 1000 ids. */
const READ_PAGE_SIZE = 500

/**
 * `in.(...)` travels in the query string, and 873 uuids are ~32 KB of URI —
 * far past what the gateway accepts. Deleting in chunks keeps every request
 * small; a chunk that fails leaves the rest of the old set behind rather than
 * killing the whole run.
 */
const DELETE_CHUNK_SIZE = 100

/**
 * Insert first, then drop the previously imported rows by id. Deleting first
 * would leave the library empty if the insert then failed, and there is no
 * transaction across two PostgREST requests. The overlap is visible only as
 * duplicates for the moment between the two calls.
 *
 * Not an upsert on `name`: exercises.name has no unique constraint, and adding
 * one would stop two users from each creating an exercise with the same name.
 */
export async function replaceImportedExercises(client: ImportClient, rows: ExerciseRow[]) {
  const oldIds: string[] = []
  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const { data, error } = await client
      .from('exercises')
      .select('id')
      .is('created_by', null)
      .range(from, from + READ_PAGE_SIZE - 1)
    if (error) throw new Error(`import failed while reading the old set: ${error.message}`)
    const page = data ?? []
    oldIds.push(...page.map((row) => row.id))
    if (page.length < READ_PAGE_SIZE) break
  }

  const { error: insertError } = await client.from('exercises').insert(rows)
  if (insertError) throw new Error(`import failed: ${insertError.message}`)

  for (let from = 0; from < oldIds.length; from += DELETE_CHUNK_SIZE) {
    const chunk = oldIds.slice(from, from + DELETE_CHUNK_SIZE)
    const { error } = await client.from('exercises').delete().in('id', chunk)
    if (error) {
      throw new Error(
        `import inserted the new set but could not remove all of the old one (${from} of ${oldIds.length} removed): ${error.message}`,
      )
    }
  }
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.')
  }

  const supabase = createClient(url, serviceRoleKey)
  const fixturePath = fileURLToPath(new URL('./free-exercise-db.json', import.meta.url))
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8')) as RawExercise[]
  const rows = raw.map(toExerciseRow)

  // ponytail: re-running after users built plans on imported exercises fails
  // on the foreign key from workout_plan_day_exercises — fine for a one-off
  // seed; make it a name-keyed diff if the dataset ever needs refreshing.
  await replaceImportedExercises(supabase as unknown as ImportClient, rows)

  console.log(`imported ${rows.length} exercises`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}

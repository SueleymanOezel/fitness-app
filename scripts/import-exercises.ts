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

type ImportClient = {
  from: (table: string) => {
    select: (columns: string) => { is: (column: string, value: null) => PromiseLike<{ data: { id: string }[] | null; error: { message: string } | null }> }
    insert: (rows: ExerciseRow[]) => PromiseLike<{ error: { message: string } | null }>
    delete: () => { in: (column: string, values: string[]) => PromiseLike<{ error: { message: string } | null }> }
  }
}

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
  const { data: existing, error: readError } = await client.from('exercises').select('id').is('created_by', null)
  if (readError) throw new Error(`import failed while reading the old set: ${readError.message}`)

  const { error: insertError } = await client.from('exercises').insert(rows)
  if (insertError) throw new Error(`import failed: ${insertError.message}`)

  const oldIds = (existing ?? []).map((row) => row.id)
  if (oldIds.length > 0) {
    const { error: deleteError } = await client.from('exercises').delete().in('id', oldIds)
    if (deleteError) throw new Error(`import inserted the new set but could not remove the old one: ${deleteError.message}`)
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

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

  // Replace the whole imported set (created_by is null); user-created
  // exercises are never touched. Not an upsert on `name`: there is no unique
  // constraint on exercises.name, and adding one would stop two users from
  // each creating an exercise with the same name.
  // ponytail: re-running after users built plans on imported exercises fails
  // on the foreign key from workout_plan_day_exercises — fine for a one-off
  // seed; make it a name-keyed diff if the dataset ever needs refreshing.
  const { error: deleteError } = await supabase.from('exercises').delete().is('created_by', null)
  if (deleteError) throw new Error(`import failed while clearing the old set: ${deleteError.message}`)

  const { error } = await supabase.from('exercises').insert(rows)
  if (error) throw new Error(`import failed: ${error.message}`)

  console.log(`imported ${rows.length} exercises`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}

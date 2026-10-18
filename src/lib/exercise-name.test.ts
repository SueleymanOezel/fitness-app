import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exerciseName } from './exercise-name'

describe('exerciseName', () => {
  it('prefers the German name', () => {
    expect(exerciseName({ name: 'Bench Press', name_de: 'Bankdrücken' })).toBe('Bankdrücken')
  })

  it('falls back to the English name without a translation', () => {
    expect(exerciseName({ name: 'Bench Press', name_de: null })).toBe('Bench Press')
    expect(exerciseName({ name: 'Bench Press' })).toBe('Bench Press')
    expect(exerciseName({ name: 'Bench Press', name_de: '' })).toBe('Bench Press')
  })

  it('returns an empty string for a deleted exercise', () => {
    expect(exerciseName(null)).toBe('')
    expect(exerciseName(undefined)).toBe('')
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : []
  })
}

describe('English exercise names in the UI', () => {
  it('no page or component reads exercise.name without a German name or exerciseName()', () => {
    const offenders: string[] = []
    for (const folder of ['src/pages', 'src/components']) {
      for (const file of sourceFiles(resolve(process.cwd(), folder))) {
        readFileSync(file, 'utf8')
          .split(/\r?\n/)
          .forEach((line, index) => {
            if (/\bexercises?\??\.name\b/.test(line) && !/name_de|exerciseName/.test(line)) {
              offenders.push(`${file}:${index + 1}: ${line.trim()}`)
            }
          })
      }
    }
    expect(offenders).toEqual([])
  })
})

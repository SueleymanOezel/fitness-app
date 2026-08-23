import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(
  resolve(cwd(), 'supabase/migrations/0006_body_photos_bucket.sql'),
  'utf-8',
)
/** Comments name things the statements must not do. */
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0006_body_photos_bucket.sql', () => {
  it('creates the bucket as private', () => {
    // A public bucket cannot be undone after the fact: anything once reachable
    // through a guessed URL may already have been fetched.
    expect(statements).toContain("insert into storage.buckets")
    expect(statements).toContain("'body-photos'")
    expect(statements).toMatch(/values \('body-photos', 'body-photos', false\)/)
    expect(statements).not.toMatch(/values \([^)]*true\)/)
  })

  it('is safe to run twice', () => {
    expect(statements).toContain('on conflict (id) do nothing')
  })

  it('restricts every policy to the folder named after the user', () => {
    const guard = "(storage.foldername(name))[1] = auth.uid()::text"
    for (const action of ['select', 'insert', 'delete']) {
      expect(statements).toContain(`for ${action}`)
    }
    // Three policies, each carrying the ownership guard.
    expect(statements.split(guard).length - 1).toBeGreaterThanOrEqual(3)
  })

  it('grants no update policy', () => {
    // A photo is replaced by deleting and uploading again.
    expect(statements).not.toMatch(/for update/)
  })

  it('binds the policies to authenticated users only', () => {
    expect(statements.split('to authenticated').length - 1).toBeGreaterThanOrEqual(3)
  })

  it('touches no application table', () => {
    expect(statements).not.toMatch(/alter table public\./)
    expect(statements).not.toMatch(/create table/i)
  })
})

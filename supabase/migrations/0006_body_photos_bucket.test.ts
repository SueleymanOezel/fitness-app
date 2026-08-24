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
    expect(statements).toMatch(/values \('body-photos', 'body-photos', false,/)
    expect(statements).not.toMatch(/values \([^)]*true\)/)
  })

  it('caps the upload size in the bucket, not only in the client', () => {
    // The client-side resize is a convenience, not a control: anyone with the
    // anon key and their own token can post an arbitrary file to their folder.
    expect(statements).toMatch(/file_size_limit/)
    expect(statements).toMatch(/\b5242880\b/)
  })

  it('restricts the upload type to images', () => {
    expect(statements).toMatch(/allowed_mime_types/)
    // image/jpeg is what the canvas re-encode actually produces.
    expect(statements).toMatch(/array\[[^\]]*'image\/jpeg'[^\]]*\]/)
    expect(statements).not.toMatch(/allowed_mime_types[^;]*'\*\/\*'/)
  })

  // Not "safe to run twice": `create policy` has no `if not exists` in Postgres,
  // so a second run of the whole file would fail on the first policy. Supabase
  // applies each migration once, so only the bucket insert is guarded — and the
  // test says exactly that instead of promising more than the SQL delivers.
  it('inserts the bucket without failing on an existing one', () => {
    expect(statements).toContain('on conflict (id) do nothing')
  })

  it('grants no update policy', () => {
    // A photo is replaced by deleting and uploading again.
    expect(statements).not.toMatch(/for update/)
  })

  it('touches no application table', () => {
    expect(statements).not.toMatch(/alter table public\./)
    expect(statements).not.toMatch(/create table/i)
  })

  describe('per-policy assertions', () => {
    // Split on `create policy` to get individual policy blocks.
    const policyBlocks = statements.split(/create policy/i).slice(1)

    it('defines exactly three policies', () => {
      expect(policyBlocks).toHaveLength(3)
    })

    it('insert policy uses `with check` and not bare `using`', () => {
      const insertBlock = policyBlocks.find((block) =>
        /for\s+insert/i.test(block),
      )
      expect(insertBlock).toBeDefined()
      expect(insertBlock).toMatch(/with\s+check/i)
      // Bare `using (` without `with check` is not allowed for INSERT
      expect(insertBlock).not.toMatch(/^[^w]*using\s*\(/i)
    })

    it('select policy uses `using` and not `with check`', () => {
      const selectBlock = policyBlocks.find((block) =>
        /for\s+select/i.test(block),
      )
      expect(selectBlock).toBeDefined()
      expect(selectBlock).toMatch(/using\s*\(/)
      expect(selectBlock).not.toMatch(/with\s+check/i)
    })

    it('delete policy uses `using` and not `with check`', () => {
      const deleteBlock = policyBlocks.find((block) =>
        /for\s+delete/i.test(block),
      )
      expect(deleteBlock).toBeDefined()
      expect(deleteBlock).toMatch(/using\s*\(/)
      expect(deleteBlock).not.toMatch(/with\s+check/i)
    })

    it('every policy contains bucket_id = body-photos', () => {
      for (const block of policyBlocks) {
        expect(block).toContain("bucket_id = 'body-photos'")
      }
    })

    it('every policy contains the ownership guard', () => {
      const guard = "(storage.foldername(name))[1] = auth.uid()::text"
      for (const block of policyBlocks) {
        expect(block).toContain(guard)
      }
    })

    it('no policy contains permissive OR patterns', () => {
      for (const block of policyBlocks) {
        expect(block).not.toMatch(/or\s*\(\s*true\s*\)/i)
        expect(block).not.toMatch(/or\s+true/i)
      }
    })

    it('every policy binds to authenticated users', () => {
      for (const block of policyBlocks) {
        expect(block).toContain('to authenticated')
      }
    })
  })
})

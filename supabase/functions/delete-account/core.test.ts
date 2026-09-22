// supabase/functions/delete-account/core.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { deleteAccount, LIST_PAGE_SIZE, type AdminAuth, type CallerAuth, type Storage } from './core.ts'

function fakeCallerAuth(userId: string | null): CallerAuth {
  return {
    getUser: () =>
      Promise.resolve(
        userId
          ? { data: { user: { id: userId } }, error: null }
          : { data: { user: null }, error: { message: 'invalid token' } },
      ),
  }
}

Deno.test("deletes the caller's storage files and account on success", async () => {
  const removedCalls: string[][] = []
  const deletedUserIds: string[] = []
  const storage: Storage = {
    list: () => Promise.resolve({ data: [{ name: 'a.jpg' }, { name: 'b.jpg' }], error: null }),
    remove: (paths) => {
      removedCalls.push(paths)
      return Promise.resolve({ error: null })
    },
  }
  const admin: AdminAuth = {
    deleteUser: (userId) => {
      deletedUserIds.push(userId)
      return Promise.resolve({ error: null })
    },
  }

  const result = await deleteAccount(fakeCallerAuth('u1'), admin, storage)

  assertEquals(result, { ok: true })
  assertEquals(removedCalls, [['u1/a.jpg', 'u1/b.jpg']])
  assertEquals(deletedUserIds, ['u1'])
})

Deno.test('rejects when the caller has no valid session', async () => {
  const storage: Storage = {
    list: () => Promise.resolve({ data: [], error: null }),
    remove: () => Promise.resolve({ error: null }),
  }
  const admin: AdminAuth = { deleteUser: () => Promise.resolve({ error: null }) }

  const result = await deleteAccount(fakeCallerAuth(null), admin, storage)

  assertEquals(result, { ok: false, error: 'invalid session' })
})

Deno.test('skips storage.remove when there are no files, still deletes the account', async () => {
  let removeCalled = false
  const storage: Storage = {
    list: () => Promise.resolve({ data: [], error: null }),
    remove: () => {
      removeCalled = true
      return Promise.resolve({ error: null })
    },
  }
  const deletedUserIds: string[] = []
  const admin: AdminAuth = {
    deleteUser: (userId) => {
      deletedUserIds.push(userId)
      return Promise.resolve({ error: null })
    },
  }

  const result = await deleteAccount(fakeCallerAuth('u1'), admin, storage)

  assertEquals(result, { ok: true })
  assertEquals(removeCalled, false)
  assertEquals(deletedUserIds, ['u1'])
})

Deno.test('stops before deleting the account when storage cleanup fails', async () => {
  let deleteCalled = false
  const storage: Storage = {
    list: () => Promise.resolve({ data: [{ name: 'a.jpg' }], error: null }),
    remove: () => Promise.resolve({ error: { message: 'storage down' } }),
  }
  const admin: AdminAuth = {
    deleteUser: () => {
      deleteCalled = true
      return Promise.resolve({ error: null })
    },
  }

  const result = await deleteAccount(fakeCallerAuth('u1'), admin, storage)

  assertEquals(result, { ok: false, error: 'storage cleanup failed' })
  assertEquals(deleteCalled, false)
})

Deno.test('reports an error when deleteUser fails after successful cleanup', async () => {
  const storage: Storage = {
    list: () => Promise.resolve({ data: [], error: null }),
    remove: () => Promise.resolve({ error: null }),
  }
  const admin: AdminAuth = { deleteUser: () => Promise.resolve({ error: { message: 'admin api down' } }) }

  const result = await deleteAccount(fakeCallerAuth('u1'), admin, storage)

  assertEquals(result, { ok: false, error: 'account deletion failed' })
})

Deno.test('pages through storage.list beyond a single page, collecting and removing every file across pages', async () => {
  // A user with more files than fit in one storage.list() page (e.g. more than
  // 100 progress photos) must not have the tail silently left behind as
  // unreachable residue once the account is gone. Simulate a first full page
  // (LIST_PAGE_SIZE files) followed by a second, partial page (1 file) —
  // mirroring the "100 then 1" shape from the review, just at the real page
  // size used by the implementation.
  const listCalls: { prefix: string; options: { limit: number; offset: number } }[] = []
  const fullPage = Array.from({ length: LIST_PAGE_SIZE }, (_, i) => ({ name: `photo-${i}.jpg` }))
  const partialPage = [{ name: 'overflow.jpg' }]
  const removedCalls: string[][] = []
  const deletedUserIds: string[] = []

  const storage: Storage = {
    list: (prefix, options) => {
      listCalls.push({ prefix, options })
      if (options.offset === 0) return Promise.resolve({ data: fullPage, error: null })
      if (options.offset === LIST_PAGE_SIZE) return Promise.resolve({ data: partialPage, error: null })
      return Promise.resolve({ data: [], error: null })
    },
    remove: (paths) => {
      removedCalls.push(paths)
      return Promise.resolve({ error: null })
    },
  }
  const admin: AdminAuth = {
    deleteUser: (userId) => {
      deletedUserIds.push(userId)
      return Promise.resolve({ error: null })
    },
  }

  const result = await deleteAccount(fakeCallerAuth('u1'), admin, storage)

  assertEquals(result, { ok: true })
  // Two list() calls: the first full page forces a second, which comes back partial and ends the loop.
  assertEquals(listCalls.length, 2)
  assertEquals(listCalls[0].options, { limit: LIST_PAGE_SIZE, offset: 0 })
  assertEquals(listCalls[1].options, { limit: LIST_PAGE_SIZE, offset: LIST_PAGE_SIZE })
  // LIST_PAGE_SIZE + 1 files collected across both pages exceeds the 1000-path
  // remove() batch limit, so removal itself is batched into two calls too.
  assertEquals(removedCalls.length, 2)
  assertEquals(removedCalls[0].length, LIST_PAGE_SIZE)
  assertEquals(removedCalls[1], ['u1/overflow.jpg'])
  assertEquals(deletedUserIds, ['u1'])
})

Deno.test('stops before removing or deleting the account when storage.list itself errors', async () => {
  let removeCalled = false
  let deleteCalled = false
  const storage: Storage = {
    list: () => Promise.resolve({ data: null, error: { message: 'storage list down' } }),
    remove: () => {
      removeCalled = true
      return Promise.resolve({ error: null })
    },
  }
  const admin: AdminAuth = {
    deleteUser: () => {
      deleteCalled = true
      return Promise.resolve({ error: null })
    },
  }

  const result = await deleteAccount(fakeCallerAuth('u1'), admin, storage)

  assertEquals(result, { ok: false, error: 'storage cleanup failed' })
  assertEquals(removeCalled, false)
  assertEquals(deleteCalled, false)
})

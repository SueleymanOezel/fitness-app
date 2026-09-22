// supabase/functions/delete-account/core.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { deleteAccount, type AdminAuth, type CallerAuth, type Storage } from './core.ts'

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

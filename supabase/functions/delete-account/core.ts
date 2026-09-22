// supabase/functions/delete-account/core.ts
export type CallerAuth = {
  getUser(): Promise<
    | { data: { user: { id: string } }; error: null }
    | { data: { user: null }; error: { message: string } }
  >
}

export type AdminAuth = {
  deleteUser(userId: string): Promise<{ error: { message: string } | null }>
}

export type Storage = {
  list(
    prefix: string,
    options: { limit: number; offset: number },
  ): Promise<{ data: { name: string }[] | null; error: { message: string } | null }>
  remove(paths: string[]): Promise<{ error: { message: string } | null }>
}

export type DeleteAccountResult = { ok: true } | { ok: false; error: string }

export const LIST_PAGE_SIZE = 1000
const REMOVE_BATCH_SIZE = 1000

/**
 * storage.list() caps out at whatever `limit` is passed (Supabase Storage
 * defaults to 100 if omitted) — a user with more files than a single page
 * would otherwise have the rest silently left behind, unreachable once the
 * account (and thus any owner who could delete them) is gone. Page through
 * the full listing before removing anything.
 */
async function listAllFiles(
  storage: Storage,
  userId: string,
): Promise<{ names: string[]; error: { message: string } | null }> {
  const names: string[] = []
  let offset = 0

  while (true) {
    const { data, error } = await storage.list(userId, { limit: LIST_PAGE_SIZE, offset })
    if (error) return { names, error }

    const page = data ?? []
    names.push(...page.map((file) => file.name))

    if (page.length < LIST_PAGE_SIZE) break
    offset += LIST_PAGE_SIZE
  }

  return { names, error: null }
}

/**
 * Storage files have no foreign-key relationship to any Postgres table, so
 * they never disappear on their own when the account is deleted — they must
 * be removed explicitly, before deleteUser runs. If cleanup fails, the
 * account is left intact rather than deleted with orphaned files nobody can
 * reach: a retryable half-state is safer than an unretryable one.
 */
export async function deleteAccount(
  callerAuth: CallerAuth,
  adminAuth: AdminAuth,
  storage: Storage,
): Promise<DeleteAccountResult> {
  const { data, error: authError } = await callerAuth.getUser()
  if (authError || !data.user) return { ok: false, error: 'invalid session' }
  const userId = data.user.id

  const { names: fileNames, error: listError } = await listAllFiles(storage, userId)
  if (listError) return { ok: false, error: 'storage cleanup failed' }

  if (fileNames.length > 0) {
    const paths = fileNames.map((name) => `${userId}/${name}`)
    for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
      const batch = paths.slice(i, i + REMOVE_BATCH_SIZE)
      const { error: removeError } = await storage.remove(batch)
      if (removeError) return { ok: false, error: 'storage cleanup failed' }
    }
  }

  const { error: deleteError } = await adminAuth.deleteUser(userId)
  if (deleteError) return { ok: false, error: 'account deletion failed' }

  return { ok: true }
}

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
  list(prefix: string): Promise<{ data: { name: string }[] | null; error: { message: string } | null }>
  remove(paths: string[]): Promise<{ error: { message: string } | null }>
}

export type DeleteAccountResult = { ok: true } | { ok: false; error: string }

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

  const { data: files, error: listError } = await storage.list(userId)
  if (listError) return { ok: false, error: 'storage cleanup failed' }

  if (files && files.length > 0) {
    const paths = files.map((file) => `${userId}/${file.name}`)
    const { error: removeError } = await storage.remove(paths)
    if (removeError) return { ok: false, error: 'storage cleanup failed' }
  }

  const { error: deleteError } = await adminAuth.deleteUser(userId)
  if (deleteError) return { ok: false, error: 'account deletion failed' }

  return { ok: true }
}

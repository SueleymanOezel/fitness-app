// supabase/functions/delete-account/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.115.0'
import { deleteAccount } from './core.ts'

const BODY_PHOTO_BUCKET = 'body-photos'

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: 'missing authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Scoped to the caller's own JWT: getUser() below can only ever resolve to
  // whoever made this request, never an id a client could supply itself.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const result = await deleteAccount(
    { getUser: () => callerClient.auth.getUser() },
    { deleteUser: (userId: string) => adminClient.auth.admin.deleteUser(userId) },
    {
      list: (prefix: string) => adminClient.storage.from(BODY_PHOTO_BUCKET).list(prefix),
      remove: (paths: string[]) => adminClient.storage.from(BODY_PHOTO_BUCKET).remove(paths),
    },
  )

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json' },
  })
})

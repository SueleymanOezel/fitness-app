import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../hooks/use-session'
import { fieldLabelClass, inputClass, linkClass } from '../lib/ui-classes'
import Pressable from '../components/Pressable'
import PageSkeleton from '../components/PageSkeleton'
import { authFehlerText } from '../lib/auth-errors'

/**
 * Target of the "Passwort vergessen?" e-mail. supabase-js reads the recovery
 * token from the URL and signs the user in; without that session (link expired,
 * already used, page opened directly) there is nothing to change.
 */
export default function ResetPasswordPage() {
  const { session, loading } = useSession()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  if (loading) return <PageSkeleton titel="Neues Passwort" />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    setSubmitting(true)
    const { error: authError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (authError) {
      setError(authFehlerText(authError))
      return
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <img src="/logo.webp" alt="VitaLoop" className="h-28 w-auto" />
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-lg font-semibold">Neues Passwort</h1>
        {session ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className={fieldLabelClass}>
              Neues Passwort
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Pressable variant="primary" type="submit" disabled={submitting}>
              Passwort speichern
            </Pressable>
          </form>
        ) : (
          <>
            <p role="alert">Dieser Link ist abgelaufen oder wurde schon benutzt. Fordere auf der Anmeldeseite einen neuen an.</p>
            <Link to="/login" className={linkClass}>
              Zum Einloggen
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

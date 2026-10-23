import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fieldLabelClass, inputClass } from '../lib/ui-classes'
import Pressable from '../components/Pressable'
import { authFehlerText } from '../lib/auth-errors'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const navigate = useNavigate()

  function validate(): string | null {
    if (!email.trim() || !password) return 'E-Mail und Passwort sind erforderlich.'
    if (password.length < 8) return 'Das Passwort muss mindestens 8 Zeichen lang sein.'
    return null
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email, password })

        if (authError) {
          setError(authFehlerText(authError))
          return
        }

        if (!data.session) {
          setError('Bitte bestätige deine E-Mail-Adresse, dann kannst du dich einloggen.')
          return
        }

        navigate('/')
        return
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authFehlerText(authError))
        return
      }

      if (data.session) {
        navigate('/')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    setError(null)
    setHinweis(null)
    if (!email.trim()) {
      setError('Bitte trag zuerst deine E-Mail-Adresse ein.')
      return
    }
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (authError) {
      setError(authFehlerText(authError))
      return
    }
    // Same text whether or not the address has an account — it must not reveal which e-mails are registered.
    setHinweis('Wenn es zu dieser E-Mail ein Konto gibt, haben wir dir einen Link zum Zurücksetzen geschickt.')
  }

  function toggleMode() {
    setError(null)
    setHinweis(null)
    setMode(mode === 'login' ? 'signup' : 'login')
  }

  async function handleGoogleSignIn() {
    setError(null)
    // Same call for login and signup: Supabase creates the auth.users row (and,
    // via the handle_new_user trigger, the profiles row) on first Google
    // sign-in, so there is no separate "register with Google" action.
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (authError) setError(authFehlerText(authError))
  }

  // Which field a validation message is about, so it can be marked and announced with it.
  const fehlerFeld = error == null ? null : !email.trim() ? 'email' : password.length < 8 ? 'password' : null

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <img src="/logo.webp" alt="VitaLoop" className="h-28 w-auto" />
      <p className="max-w-sm text-center text-text-muted">Training, Essen und Körper in einer App. Ohne Abo, ohne Werbung.</p>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-lg font-semibold">
          {mode === 'login' ? 'Einloggen' : 'Registrieren'}
        </h1>
        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="email">
            E-Mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            aria-invalid={fehlerFeld === 'email' || undefined}
            aria-describedby={error ? 'login-fehler' : undefined}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="password">
            Passwort
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={inputClass}
            aria-invalid={fehlerFeld === 'password' || undefined}
            aria-describedby={[mode === 'signup' ? 'passwort-regel' : '', error ? 'login-fehler' : ''].join(' ').trim() || undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {mode === 'signup' && (
            <p id="passwort-regel" className="text-sm text-text-muted">
              Mindestens 8 Zeichen.
            </p>
          )}
        </div>
        {mode === 'login' && (
          <Pressable
            type="button"
            className="self-end border-0 bg-transparent text-sm text-accent-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={handleForgotPassword}
          >
            Passwort vergessen?
          </Pressable>
        )}
        {error && (
          <p id="login-fehler" role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {hinweis && (
          <p role="status" className="text-sm">
            {hinweis}
          </p>
        )}
        <Pressable variant="primary" type="submit" disabled={submitting}>
          {mode === 'login' ? 'Einloggen' : 'Registrieren'}
        </Pressable>
        <Pressable variant="secondary" type="button" className="w-full" onClick={handleGoogleSignIn}>
          Mit Google anmelden
        </Pressable>
        <Pressable
          type="button"
          className="w-full border-0 bg-transparent text-center text-sm text-accent-text underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={toggleMode}
        >
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon registriert? Einloggen'}
        </Pressable>
      </form>
    </div>
  )
}

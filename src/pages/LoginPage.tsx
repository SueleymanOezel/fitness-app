import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
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
          setError(authError.message)
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
        setError(authError.message)
        return
      }

      if (data.session) {
        navigate('/')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function toggleMode() {
    setError(null)
    setMode(mode === 'login' ? 'signup' : 'login')
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{mode === 'login' ? 'Login' : 'Registrieren'}</h1>
      <label>
        E-Mail
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Passwort
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {mode === 'login' ? 'Einloggen' : 'Registrieren'}
      </button>
      <button type="button" onClick={toggleMode}>
        {mode === 'login' ? 'Noch keinen Account? Registrieren' : 'Schon registriert? Einloggen'}
      </button>
    </form>
  )
}

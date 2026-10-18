import { describe, expect, it } from 'vitest'
import { authFehlerText } from './auth-errors'

describe('authFehlerText', () => {
  it('translates known codes', () => {
    expect(authFehlerText({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'E-Mail oder Passwort stimmt nicht.',
    )
    expect(authFehlerText({ code: 'user_already_exists' })).toContain('schon ein Konto')
  })

  it('reports a missing connection', () => {
    expect(authFehlerText({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' })).toContain(
      'Keine Verbindung',
    )
  })

  it('never leaks the English server message for an unknown error', () => {
    const text = authFehlerText({ code: 'something_new', message: 'Database error saving new user' })
    expect(text).not.toContain('Database')
    expect(text).toBe('Das hat nicht geklappt. Bitte versuche es erneut.')
  })
})

/** Das, was wir von Supabases AuthError brauchen; der englische `message`-Text gehört nie in die Oberfläche. */
type AuthErrorLike = { code?: string; status?: number; message?: string; name?: string }

const MELDUNGEN: Record<string, string> = {
  invalid_credentials: 'E-Mail oder Passwort stimmt nicht.',
  email_not_confirmed: 'Bitte bestätige zuerst deine E-Mail-Adresse.',
  user_already_exists: 'Mit dieser E-Mail gibt es schon ein Konto. Bitte logge dich ein.',
  email_exists: 'Mit dieser E-Mail gibt es schon ein Konto. Bitte logge dich ein.',
  weak_password: 'Dieses Passwort ist zu schwach. Wähle ein längeres oder weniger häufiges.',
  signup_disabled: 'Die Registrierung ist gerade nicht möglich.',
  over_request_rate_limit: 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.',
  over_email_send_rate_limit: 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.',
  validation_failed: 'Bitte prüfe deine Eingaben.',
}

export function authFehlerText(error: AuthErrorLike): string {
  if (error.code && MELDUNGEN[error.code]) return MELDUNGEN[error.code]
  // Ohne Antwort des Servers (offline, Zeitüberschreitung) gibt es weder Code noch Status.
  if (error.status === 0 || error.name === 'AuthRetryableFetchError') {
    return 'Keine Verbindung. Bitte prüfe dein Internet und versuche es erneut.'
  }
  return 'Das hat nicht geklappt. Bitte versuche es erneut.'
}

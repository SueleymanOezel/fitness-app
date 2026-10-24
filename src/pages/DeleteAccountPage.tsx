import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { cardClass, fieldLabelClass, inputClass, linkClass } from '../lib/ui-classes'
import Pressable, { PressableLink } from '../components/Pressable'
import { VitaIcon } from '../components/icons/VitaIcon'

const DELETE_CONFIRM_WORD = 'LÖSCHEN'

/**
 * Its own page, not a dialog at the bottom of the profile: deleting everything is rare and
 * final, and it sat one scroll away from "Speichern" (re-audit 23.10.2026). The page itself is
 * the confirmation; typing the word stays as the last guard.
 */
export default function DeleteAccountPage() {
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setSubmitting(true)
    setError(null)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<{
        ok: boolean
        error?: string
      }>('delete-account')
      if (invokeError || !data?.ok) {
        setSubmitting(false)
        setError('Konto konnte nicht gelöscht werden. Bitte erneut versuchen.')
        return
      }
      // 'local' clears only client-side storage without a server round-trip —
      // the default 'global' scope would fail with 403 since the account (and
      // thus its session) is already gone server-side at this point.
      supabase.auth.signOut({ scope: 'local' }).catch(() => {
        /* signOut failed network-side; navigating to /login below still clears the UI */
      })
      navigate('/login')
    } catch {
      setSubmitting(false)
      setError('Konto konnte nicht gelöscht werden. Bitte erneut versuchen.')
    }
  }

  return (
    <div>
      <h1>Konto löschen</h1>
      <div className={`${cardClass} flex flex-col`}>
        <p>
          Alle Trainings-, Ernährungs- und Körperdaten sowie Fortschrittsfotos werden
          unwiderruflich gelöscht, deine Anmeldung verschwindet. Das lässt sich nicht rückgängig
          machen.
        </p>
        <label className={fieldLabelClass}>
          Bestätigung: {DELETE_CONFIRM_WORD} eingeben
          <input
            type="text"
            className={inputClass}
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Pressable
          variant="danger"
          type="button"
          disabled={confirmText !== DELETE_CONFIRM_WORD || submitting}
          onClick={handleDelete}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <VitaIcon name="delete" tone="mono" size={20} />
            Konto endgültig löschen
          </span>
        </Pressable>
        <PressableLink to="/profile" className={`${linkClass} self-start`}>
          Abbrechen
        </PressableLink>
      </div>
    </div>
  )
}

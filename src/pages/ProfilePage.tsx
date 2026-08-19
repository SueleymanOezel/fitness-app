import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../hooks/use-session'
import { useProfile, type Profile } from '../hooks/use-profile'
import CalorieGoalEditor from '../components/CalorieGoalEditor'

type Draft = {
  name: string
  alter: string
  groesse: string
  aktuelles_gewicht: string
  geschlecht: string
  aktivitaetslevel: string
  ziel: string
  ziel_delta_kcal: string
}

/**
 * These bounds are not cosmetic: the calorie goal is computed from these values,
 * so a mistyped weight of 800 kg would silently produce an absurd target.
 */
const RANGES = {
  alter: [10, 120],
  groesse: [100, 250],
  aktuelles_gewicht: [30, 300],
  ziel_delta_kcal: [0, 1500],
} as const

const GESCHLECHT = [
  ['maennlich', 'männlich'],
  ['weiblich', 'weiblich'],
] as const

const AKTIVITAET = [
  ['sitzend', 'sitzend'],
  ['leicht', 'leicht aktiv'],
  ['moderat', 'moderat aktiv'],
  ['hoch', 'hoch aktiv'],
  ['sehr_hoch', 'sehr hoch aktiv'],
] as const

const ZIEL = [
  ['abnehmen', 'abnehmen'],
  ['halten', 'halten'],
  ['zunehmen', 'zunehmen'],
] as const

function toDraft(profile: Profile): Draft {
  return {
    name: profile.name ?? '',
    alter: profile.alter?.toString() ?? '',
    groesse: profile.groesse?.toString() ?? '',
    aktuelles_gewicht: profile.aktuelles_gewicht?.toString() ?? '',
    geschlecht: profile.geschlecht ?? '',
    aktivitaetslevel: profile.aktivitaetslevel ?? '',
    ziel: profile.ziel ?? '',
    ziel_delta_kcal: profile.ziel_delta_kcal?.toString() ?? '',
  }
}

/** Empty stays empty (null); out-of-range is rejected so it never reaches the database. */
function parseNumber(value: string, [min, max]: readonly [number, number]) {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined
}

function toPatch(draft: Draft): Partial<Profile> | null {
  const alter = parseNumber(draft.alter, RANGES.alter)
  const groesse = parseNumber(draft.groesse, RANGES.groesse)
  const aktuelles_gewicht = parseNumber(draft.aktuelles_gewicht, RANGES.aktuelles_gewicht)
  const ziel_delta_kcal = parseNumber(draft.ziel_delta_kcal, RANGES.ziel_delta_kcal)

  if (
    alter === undefined ||
    groesse === undefined ||
    aktuelles_gewicht === undefined ||
    ziel_delta_kcal === undefined
  ) {
    return null
  }

  return {
    name: draft.name.trim() || null,
    alter,
    groesse,
    aktuelles_gewicht,
    geschlecht: (draft.geschlecht || null) as Profile['geschlecht'],
    aktivitaetslevel: (draft.aktivitaetslevel || null) as Profile['aktivitaetslevel'],
    ziel: (draft.ziel || null) as Profile['ziel'],
    ziel_delta_kcal: ziel_delta_kcal ?? 0,
  }
}

export default function ProfilePage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Profil</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <ProfileForm userId={userId} />
}

function ProfileForm({ userId }: { userId: string }) {
  const { profile, loading, error, reload, updateProfile } = useProfile(userId)

  if (loading) {
    return (
      <div>
        <h1>Profil</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div>
        <h1>Profil</h1>
        <p role="alert">Profil konnte nicht geladen werden.</p>
        <button type="button" onClick={() => reload()}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  return <LoadedProfileForm profile={profile} onUpdate={updateProfile} />
}

function LoadedProfileForm({
  profile,
  onUpdate,
}: {
  profile: Profile
  onUpdate: (patch: Partial<Profile>) => Promise<void>
}) {
  // Held as a draft and written on submit: the eight fields belong together, and
  // a half-saved profile (new height, old weight) would compute a wrong goal.
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile))
  const [status, setStatus] = useState<'idle' | 'saved' | 'invalid' | 'failed'>('idle')

  function set<K extends keyof Draft>(field: K, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    setStatus('idle')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const patch = toPatch(draft)
    if (!patch) {
      setStatus('invalid')
      return
    }

    try {
      await onUpdate(patch)
      setStatus('saved')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div>
      <h1>Profil</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input value={draft.name} onChange={(event) => set('name', event.target.value)} />
        </label>
        <label>
          Alter (Jahre)
          <input
            type="number"
            value={draft.alter}
            onChange={(event) => set('alter', event.target.value)}
          />
        </label>
        <label>
          Größe (cm)
          <input
            type="number"
            value={draft.groesse}
            onChange={(event) => set('groesse', event.target.value)}
          />
        </label>
        <label>
          Gewicht (kg)
          <input
            type="number"
            value={draft.aktuelles_gewicht}
            onChange={(event) => set('aktuelles_gewicht', event.target.value)}
          />
        </label>
        <label>
          Geschlecht
          <select
            value={draft.geschlecht}
            onChange={(event) => set('geschlecht', event.target.value)}
          >
            <option value="">bitte wählen</option>
            {GESCHLECHT.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Aktivitätslevel
          <select
            value={draft.aktivitaetslevel}
            onChange={(event) => set('aktivitaetslevel', event.target.value)}
          >
            <option value="">bitte wählen</option>
            {AKTIVITAET.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ziel
          <select value={draft.ziel} onChange={(event) => set('ziel', event.target.value)}>
            <option value="">bitte wählen</option>
            {ZIEL.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ziel-Delta (kcal)
          <input
            type="number"
            value={draft.ziel_delta_kcal}
            onChange={(event) => set('ziel_delta_kcal', event.target.value)}
          />
        </label>

        {status === 'invalid' && (
          <p role="alert">
            Bitte plausible Werte eingeben (Alter {RANGES.alter[0]}–{RANGES.alter[1]}, Größe{' '}
            {RANGES.groesse[0]}–{RANGES.groesse[1]} cm, Gewicht {RANGES.aktuelles_gewicht[0]}–
            {RANGES.aktuelles_gewicht[1]} kg, Ziel-Delta {RANGES.ziel_delta_kcal[0]}–
            {RANGES.ziel_delta_kcal[1]} kcal).
          </p>
        )}
        {status === 'failed' && <p role="alert">Profil konnte nicht gespeichert werden.</p>}
        {status === 'saved' && <p role="status">Gespeichert.</p>}

        <button type="submit">Speichern</button>
      </form>

      <h2>Tagesziel</h2>
      <CalorieGoalEditor profile={profile} onUpdate={onUpdate} />

      <button
        type="button"
        onClick={() => {
          supabase.auth.signOut().catch(() => {
            /* signOut failed network-side; ProtectedRoute re-checks the session on the next render anyway */
          })
        }}
      >
        Logout
      </button>
    </div>
  )
}

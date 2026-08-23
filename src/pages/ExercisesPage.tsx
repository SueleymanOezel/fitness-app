import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useExercises } from '../hooks/use-exercises'

export default function ExercisesPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Übungen</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <ExercisesList userId={userId} />
}

function ExercisesList({ userId }: { userId: string }) {
  const { exercises, loading, error: loadError, createExercise } = useExercises(userId)
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)

  if (loading) {
    return (
      <div>
        <h1>Übungen</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (loadError) {
    // A partly loaded library would look complete and quietly hide exercises.
    return (
      <div>
        <h1>Übungen</h1>
        <p role="alert">Übungen konnten nicht geladen werden.</p>
        <Link to="/training">Zurück zum Training</Link>
      </div>
    )
  }

  const filtered = exercises.filter((exercise) => exercise.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <h1>Übungen</h1>
      <label>
        Suche
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul>
        {filtered.map((exercise) => (
          <li key={exercise.id}>{exercise.name}</li>
        ))}
      </ul>
      {showForm ? (
        <NewExerciseForm
          onSave={async (input) => {
            await createExercise(input)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button type="button" onClick={() => setShowForm(true)}>
          Eigene Übung anlegen
        </button>
      )}
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}

function NewExerciseForm({
  onSave,
  onCancel,
}: {
  onSave: (input: { name: string; kategorie: string; met_wert: number }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState('')
  const [metWert, setMetWert] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    // Number('') is 0, not "unset" — an empty MET field must not silently save as 0.
    const met = metWert === '' ? null : Number(metWert)
    if (name.trim() === '' || kategorie.trim() === '' || met === null || !Number.isFinite(met) || met <= 0) {
      setError('Name, Kategorie und ein MET-Wert größer als 0 sind nötig.')
      return
    }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), kategorie: kategorie.trim(), met_wert: met })
    } catch {
      setError('Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Kategorie
        <input value={kategorie} onChange={(event) => setKategorie(event.target.value)} />
      </label>
      <label>
        MET-Wert
        <input type="number" value={metWert} onChange={(event) => setMetWert(event.target.value)} />
      </label>
      {error !== '' && <p role="alert">{error}</p>}
      <button type="submit" disabled={saving}>
        Speichern
      </button>
      <button type="button" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  )
}

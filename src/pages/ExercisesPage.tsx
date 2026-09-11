import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useExercises, type Exercise, type NewExercise } from '../hooks/use-exercises'
import { cardClass, buttonPrimaryClass, buttonSecondaryClass, interactiveClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import ExerciseDetailDialog from '../components/ExerciseDetailDialog'
import ExerciseFilterChips from '../components/ExerciseFilterChips'
import { VitaIcon } from '../components/icons/VitaIcon'
import { matchesExerciseFilter, uniqueEquipment, uniqueMuskelgruppen } from '../lib/exercise-filters'

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
  const [muskelgruppe, setMuskelgruppe] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

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
    // This blocks the whole page, so it stays inline rather than a toast
    // that would vanish while the page is still broken.
    return (
      <div>
        <h1>Übungen</h1>
        <p role="alert">Übungen konnten nicht geladen werden.</p>
        <Link to="/training" className="flex items-center justify-center gap-2">
          <VitaIcon name="back" tone="brand" size={20} />
          Zurück zum Training
        </Link>
      </div>
    )
  }

  const muskelgruppen = uniqueMuskelgruppen(exercises)
  const equipmentWerte = uniqueEquipment(exercises)

  const filtered = exercises
    .filter((exercise) => matchesExerciseFilter(exercise, { query, muskelgruppe, equipment }))
    .sort((a, b) => (a.name_de ?? a.name).localeCompare(b.name_de ?? b.name, 'de'))

  return (
    <div>
      <h1>Übungen</h1>
      <ExerciseFilterChips
        muskelgruppen={muskelgruppen}
        muskelgruppe={muskelgruppe}
        onMuskelgruppeChange={setMuskelgruppe}
        equipmentWerte={equipmentWerte}
        equipment={equipment}
        onEquipmentChange={setEquipment}
      />
      <label>
        Suche
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul role="list" className="space-y-4">
        {filtered.map((exercise) => (
          <li key={exercise.id} className="block border-b-0">
            <button
              type="button"
              className={`${cardClass} ${interactiveClass} flex w-full items-center gap-4 text-left focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
              onClick={() => setSelectedExercise(exercise)}
            >
              {exercise.bild_url ? (
                <img
                  src={exercise.bild_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <VitaIcon name="exercises" tone="mono" size={48} className="shrink-0" />
              )}
              <span className="flex-1 text-left">{exercise.name_de ?? exercise.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className={buttonPrimaryClass} onClick={() => setDialogOpen(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="add" tone="mono" size={20} />
          Eigene Übung anlegen
        </span>
      </button>
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the form only while open forces a fresh instance (blank
          fields) each time it opens, instead of showing the last attempt's
          leftover values on reopen. */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        {dialogOpen && (
          <NewExerciseForm
            onSave={async (input) => {
              await createExercise(input)
              setDialogOpen(false)
            }}
            onCancel={() => setDialogOpen(false)}
          />
        )}
      </Dialog>
      <Dialog open={selectedExercise !== null} onClose={() => setSelectedExercise(null)}>
        {selectedExercise && <ExerciseDetailDialog exercise={selectedExercise} />}
      </Dialog>
      <Link to="/training" className="flex items-center justify-center gap-2">
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zum Training
      </Link>
    </div>
  )
}

function NewExerciseForm({
  onSave,
  onCancel,
}: {
  onSave: (input: NewExercise) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState('')
  const [metWert, setMetWert] = useState('')
  const [bildUrl, setBildUrl] = useState('')
  const [schwierigkeitsgrad, setSchwierigkeitsgrad] = useState('')
  const [anleitung, setAnleitung] = useState('')
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
    setError('')
    const bildUrlGetrimmt = bildUrl.trim()
    const schwierigkeitsgradGetrimmt = schwierigkeitsgrad.trim()
    const anleitungSchritte = anleitung
      .split('\n')
      .map((zeile) => zeile.trim())
      .filter((zeile) => zeile !== '')
    try {
      await onSave({
        name: name.trim(),
        kategorie: kategorie.trim(),
        met_wert: met,
        ...(bildUrlGetrimmt !== '' ? { bild_url: bildUrlGetrimmt } : {}),
        ...(schwierigkeitsgradGetrimmt !== '' ? { schwierigkeitsgrad: schwierigkeitsgradGetrimmt } : {}),
        ...(anleitungSchritte.length > 0 ? { anleitung: anleitungSchritte } : {}),
      })
    } catch {
      setError('Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={cardClass}>
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
          <input type="number" step="any" value={metWert} onChange={(event) => setMetWert(event.target.value)} />
        </label>
        <label>
          Bild-URL
          <input value={bildUrl} onChange={(event) => setBildUrl(event.target.value)} />
        </label>
        <label>
          Schwierigkeitsgrad
          <input value={schwierigkeitsgrad} onChange={(event) => setSchwierigkeitsgrad(event.target.value)} />
        </label>
        <label>
          Anleitung
          <textarea value={anleitung} onChange={(event) => setAnleitung(event.target.value)} />
        </label>
      </div>
      {error !== '' && <p role="alert">{error}</p>}
      <button type="submit" className={buttonPrimaryClass} disabled={saving}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="save" tone="mono" size={20} />
          Speichern
        </span>
      </button>
      <button type="button" className={buttonSecondaryClass} onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  )
}

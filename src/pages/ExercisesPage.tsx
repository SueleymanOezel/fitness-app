import { useState } from 'react'
import { useSession } from '../hooks/use-session'
import { useExercises, type Exercise, type NewExercise } from '../hooks/use-exercises'
import { cardClass, fieldLabelClass, inputClass, interactiveClass, linkClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import ExerciseDetailDialog from '../components/ExerciseDetailDialog'
import ExerciseFilterChips from '../components/ExerciseFilterChips'
import ExerciseThumbnail from '../components/ExerciseThumbnail'
import { VitaIcon } from '../components/icons/VitaIcon'
import { matchesExerciseFilter, uniqueEquipment, uniqueMuskelgruppen } from '../lib/exercise-filters'
import { exerciseCaption, revealDelay } from '../lib/exercise-caption'
import Pressable, { PressableLink } from '../components/Pressable'
import { useVisibleCount } from '../hooks/use-visible-count'

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
  const { count, showMore } = useVisibleCount(`${query}|${muskelgruppe}|${equipment}`)

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
        <PressableLink to="/training" className={linkClass}>
          <VitaIcon name="back" tone="brand" size={20} />
          Zurück zum Training
        </PressableLink>
      </div>
    )
  }

  const muskelgruppen = uniqueMuskelgruppen(exercises)
  const equipmentWerte = uniqueEquipment(exercises)

  const filtered = exercises
    .filter((exercise) => matchesExerciseFilter(exercise, { query, muskelgruppe, equipment }))
    .sort((a, b) => (a.name_de ?? a.name).localeCompare(b.name_de ?? b.name, 'de'))

  const gefiltert = filtered.length

  return (
    <div>
      <h1>Übungen</h1>
      <label className="relative block">
        <span className="sr-only">Suche</span>
        <VitaIcon
          name="search"
          tone="mono"
          size={20}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
        />
        <input className={`${inputClass} pl-12`} value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ExerciseFilterChips
        muskelgruppen={muskelgruppen}
        muskelgruppe={muskelgruppe}
        onMuskelgruppeChange={setMuskelgruppe}
        equipmentWerte={equipmentWerte}
        equipment={equipment}
        onEquipmentChange={setEquipment}
      />
      {filtered.length === 0 && <p>Keine Übungen gefunden.</p>}
      <ul role="list" className="flex flex-col gap-3">
        {filtered.slice(0, count).map((exercise, index) => {
          const caption = exerciseCaption(exercise)
          return (
            <li key={exercise.id} className="list-in" style={{ animationDelay: revealDelay(index) }}>
              {/* cardClass minus space-y-3: in a horizontal row the margins would offset the text against the thumbnail. */}
              <Pressable
                type="button"
                className={`bg-surface rounded-3xl p-6 ${interactiveClass} flex w-full items-center gap-4 text-left focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
                onClick={() => setSelectedExercise(exercise)}
              >
                <ExerciseThumbnail bildUrl={exercise.bild_url} />
                <span className="flex-1 text-left">
                  <span className="block">{exercise.name_de ?? exercise.name}</span>
                  {caption !== '' && <span className="block text-sm text-text-muted">{caption}</span>}
                </span>
              </Pressable>
            </li>
          )
        })}
      </ul>
      {gefiltert > count && (
        <Pressable variant="secondary" type="button" className="w-full" onClick={showMore}>
          {`Mehr anzeigen (${gefiltert - count} weitere)`}
        </Pressable>
      )}
      <Pressable variant="primary" type="button" onClick={() => setDialogOpen(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="add" tone="mono" size={20} />
          Eigene Übung anlegen
        </span>
      </Pressable>
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
      <PressableLink to="/training" className={linkClass}>
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zum Training
      </PressableLink>
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className={cardClass}>
        <label className={fieldLabelClass}>
          Name
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className={fieldLabelClass}>
          Kategorie
          <input className={inputClass} value={kategorie} onChange={(event) => setKategorie(event.target.value)} />
        </label>
        <label className={fieldLabelClass}>
          MET-Wert
          <input className={inputClass} type="number" step="any" value={metWert} onChange={(event) => setMetWert(event.target.value)} />
        </label>
        <label className={fieldLabelClass}>
          Bild-URL
          <input className={inputClass} value={bildUrl} onChange={(event) => setBildUrl(event.target.value)} />
        </label>
        <label className={fieldLabelClass}>
          Schwierigkeitsgrad
          <input className={inputClass} value={schwierigkeitsgrad} onChange={(event) => setSchwierigkeitsgrad(event.target.value)} />
        </label>
        <label className={fieldLabelClass}>
          Anleitung
          <textarea className={`${inputClass} min-h-28`} value={anleitung} onChange={(event) => setAnleitung(event.target.value)} />
        </label>
      </div>
      {error !== '' && <p role="alert">{error}</p>}
      <Pressable variant="primary" type="submit" disabled={saving}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="save" tone="mono" size={20} />
          Speichern
        </span>
      </Pressable>
      <Pressable variant="secondary" className="self-start" type="button" onClick={onCancel}>
        Abbrechen
      </Pressable>
    </form>
  )
}

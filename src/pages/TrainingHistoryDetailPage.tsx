import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkoutSession, type SessionInfo, type SessionSet } from '../hooks/use-workout-session'
import { exerciseName } from '../lib/exercise-name'
import { dauerText } from '../lib/dauer'
import { cardClass, labelClass, linkClass } from '../lib/ui-classes'
import { VitaIcon } from '../components/icons/VitaIcon'
import { PressableLink } from '../components/Pressable'
import ConfirmDelete from '../components/ConfirmDelete'
import LoggedSets, { SATZ_LEGENDE } from '../components/LoggedSets'
import SetEditDialog from '../components/SetEditDialog'
import PageSkeleton from '../components/PageSkeleton'

export default function TrainingHistoryDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  if (!sessionId) {
    return <PageSkeleton titel="Trainingseinheit" variante="liste" />
  }

  return <Detail sessionId={sessionId} />
}

function Detail({ sessionId }: { sessionId: string }) {
  const { session, sets, loading, updateSet, deleteSet, deleteSession } = useWorkoutSession(sessionId)
  const [bearbeiteterSatz, setBearbeiteterSatz] = useState<SessionSet | null>(null)
  const navigate = useNavigate()

  if (loading) {
    return <PageSkeleton titel="Trainingseinheit" variante="liste" />
  }

  if (!session) {
    return (
      <div>
        <h1>Trainingseinheit</h1>
        <p role="alert">Diese Trainingseinheit gibt es nicht mehr.</p>
        <PressableLink to="/training/history" className={linkClass}>
          <VitaIcon name="back" tone="brand" size={20} />
          Zurück zur Historie
        </PressableLink>
      </div>
    )
  }

  // One card per exercise, in the order the first set was logged (sets arrive by abgeschlossen_am).
  const uebungen = new Map<string, SessionSet[]>()
  for (const set of sets) uebungen.set(set.exercise_id, [...(uebungen.get(set.exercise_id) ?? []), set])

  return (
    <div>
      <div className="flex flex-col gap-1">
        <h1>{session.tag_name ?? 'Trainingseinheit'}</h1>
        <p className={labelClass}>
          {new Date(session.gestartet_am).toLocaleDateString('de-DE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <p className={labelClass}>{eckdaten(session)}</p>
      </div>
      {[...uebungen.values()].map((uebungsSaetze) => (
        <section key={uebungsSaetze[0].exercise_id} className={cardClass}>
          <h2>{exerciseName(uebungsSaetze[0].exercise) || 'Unbekannte Übung'}</h2>
          <LoggedSets sets={uebungsSaetze} onEdit={setBearbeiteterSatz} />
        </section>
      ))}
      {sets.length > 0 && <p className={labelClass}>{SATZ_LEGENDE}</p>}
      <SetEditDialog
        set={bearbeiteterSatz}
        onClose={() => setBearbeiteterSatz(null)}
        onSave={(setId, patch) => updateSet(setId, patch)}
        onDelete={(setId) => deleteSet(setId)}
      />
      <ConfirmDelete
        label="Session löschen"
        className="self-start"
        titel="Training löschen?"
        text="Alle Sätze dieser Trainingseinheit werden gelöscht. Das wirkt sich auch auf deine Analyse aus."
        onConfirm={async () => {
          await deleteSession()
          navigate('/training/history')
        }}
      />
      <PressableLink to="/training/history" className={linkClass}>
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zur Historie
      </PressableLink>
    </div>
  )
}

/** "58 min · 400 kcal"; an unfinished session has neither, and "0 kcal" would read as a measurement. */
function eckdaten(session: SessionInfo) {
  if (session.beendet_am == null) return 'nicht beendet'
  const minuten = (new Date(session.beendet_am).getTime() - new Date(session.gestartet_am).getTime()) / 60000
  const teile = [dauerText(minuten)]
  // Finished without a body weight in the profile: no calorie result was stored.
  if (session.gesamt_kalorien != null) teile.push(`${Math.round(session.gesamt_kalorien)} kcal`)
  return teile.join(' · ')
}

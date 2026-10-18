import { useState, type FormEvent } from 'react'
import Dialog from './Dialog'
import Pressable from './Pressable'
import RirChips from './RirChips'
import ConfirmDelete from './ConfirmDelete'
import type { SessionSet } from '../hooks/use-workout-session'
import { parseSetInput } from '../lib/set-values'
import { cardClass, checkLabelClass, fieldLabelClass, inputClass } from '../lib/ui-classes'

export type SetPatch = {
  gewicht: number | null
  wiederholungen: number
  rir: number | null
  ist_aufwaermsatz: boolean
}

type Props = {
  /** Der Satz, der gerade korrigiert wird; `null` = Dialog zu. */
  set: SessionSet | null
  onClose: () => void
  onSave: (setId: string, patch: SetPatch) => Promise<void>
  onDelete: (setId: string) => Promise<void>
}

/**
 * Korrektur eines bereits erfassten Satzes in der laufenden Session. Dialog hält
 * seine Kinder gemountet (siehe Dialog.tsx) — das Formular wird nur gerendert,
 * solange ein Satz gewählt ist, damit die Vorbelegung bei jedem Öffnen frisch ist.
 * Fehler stehen im Dialog: ein Toast läge hinter dem Top-Layer des offenen <dialog>.
 */
export default function SetEditDialog({ set, onClose, onSave, onDelete }: Props) {
  return (
    <Dialog open={set !== null} onClose={onClose}>
      {set && <SetEditForm key={set.id} set={set} onClose={onClose} onSave={onSave} onDelete={onDelete} />}
    </Dialog>
  )
}

function SetEditForm({
  set,
  onClose,
  onSave,
  onDelete,
}: {
  set: SessionSet
  onClose: () => void
  onSave: Props['onSave']
  onDelete: Props['onDelete']
}) {
  const [gewicht, setGewicht] = useState(set.gewicht == null ? '' : String(set.gewicht))
  const [wiederholungen, setWiederholungen] = useState(set.wiederholungen == null ? '' : String(set.wiederholungen))
  const [rir, setRir] = useState<number | null>(set.rir)
  const [istAufwaermsatz, setIstAufwaermsatz] = useState(set.ist_aufwaermsatz)
  const [fehler, setFehler] = useState<{ gewicht?: string; wiederholungen?: string }>({})
  const [speichernFehler, setSpeichernFehler] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const eingabe = parseSetInput(gewicht, wiederholungen)
    setFehler(eingabe.ok ? {} : eingabe.fehler)
    if (!eingabe.ok) return
    setSpeichernFehler(false)
    setBusy(true)
    try {
      await onSave(set.id, { ...eingabe.values, rir, ist_aufwaermsatz: istAufwaermsatz })
      onClose()
    } catch {
      setSpeichernFehler(true)
      setBusy(false)
    }
  }

  return (
    <form className={cardClass} onSubmit={submit}>
      <h2>Satz bearbeiten</h2>
      <label className={fieldLabelClass}>
        Gewicht (kg)
        <input
          className={inputClass}
          inputMode="decimal"
          value={gewicht}
          aria-invalid={fehler.gewicht !== undefined}
          onChange={(event) => setGewicht(event.target.value)}
        />
      </label>
      {fehler.gewicht && (
        <p role="alert" className="text-sm text-danger">
          {fehler.gewicht}
        </p>
      )}
      <label className={fieldLabelClass}>
        Wiederholungen
        <input
          className={inputClass}
          inputMode="numeric"
          value={wiederholungen}
          aria-invalid={fehler.wiederholungen !== undefined}
          onChange={(event) => setWiederholungen(event.target.value)}
        />
      </label>
      {fehler.wiederholungen && (
        <p role="alert" className="text-sm text-danger">
          {fehler.wiederholungen}
        </p>
      )}
      <label className={checkLabelClass}>
        <input type="checkbox" checked={istAufwaermsatz} onChange={(event) => setIstAufwaermsatz(event.target.checked)} />
        Aufwärmsatz
      </label>
      <RirChips value={rir} onChange={setRir} />
      {speichernFehler && (
        <p role="alert" className="text-sm text-danger">
          Satz konnte nicht gespeichert werden.
        </p>
      )}
      <Pressable variant="primary" type="submit" disabled={busy}>
        Speichern
      </Pressable>
      <Pressable variant="secondary" type="button" onClick={onClose}>
        Abbrechen
      </Pressable>
      <ConfirmDelete
        label="Satz löschen"
        titel="Satz löschen?"
        text="Dieser Satz wird aus dem Training entfernt."
        onConfirm={async () => {
          await onDelete(set.id)
          onClose()
        }}
      />
    </form>
  )
}

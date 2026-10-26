import { useState, type FormEvent } from 'react'
import Dialog from './Dialog'
import Pressable from './Pressable'
import RirChips from './RirChips'
import { useToast } from './ToastProvider'
import { VitaIcon } from './icons/VitaIcon'
import type { SessionSet } from '../hooks/use-workout-session'
import { parseSetInput } from '../lib/set-values'
import { cardClass, checkLabelClass, labelClass } from '../lib/ui-classes'
import { exerciseName } from '../lib/exercise-name'
import { zahlDe } from '../lib/zahl'
import ZahlFeld from './ZahlFeld'

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
  /** Puts a just-deleted set back (the toast's „Rückgängig“). */
  onRestore: (set: SessionSet) => Promise<void>
}

/**
 * Korrektur eines bereits erfassten Satzes in der laufenden Session. Dialog hält
 * seine Kinder gemountet (siehe Dialog.tsx) — das Formular wird nur gerendert,
 * solange ein Satz gewählt ist, damit die Vorbelegung bei jedem Öffnen frisch ist.
 * Fehler stehen im Dialog: ein Toast läge hinter dem Top-Layer des offenen <dialog>.
 */
export default function SetEditDialog({ set, onClose, onSave, onDelete, onRestore }: Props) {
  return (
    <Dialog open={set !== null} onClose={onClose}>
      {set && <SetEditForm key={set.id} set={set} onClose={onClose} onSave={onSave} onDelete={onDelete} onRestore={onRestore} />}
    </Dialog>
  )
}

function SetEditForm({
  set,
  onClose,
  onSave,
  onDelete,
  onRestore,
}: {
  set: SessionSet
  onClose: () => void
  onSave: Props['onSave']
  onDelete: Props['onDelete']
  onRestore: Props['onRestore']
}) {
  const showToast = useToast()
  const [loeschFehler, setLoeschFehler] = useState(false)
  // Same field and number format as the live form: "72,5", not "72.5", and −/+ instead of the keyboard.
  const [gewicht, setGewicht] = useState(set.gewicht == null ? '' : zahlDe(set.gewicht))
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
      <div className="flex flex-col gap-1">
        <h2>Satz bearbeiten</h2>
        <p className={labelClass}>{exerciseName(set.exercise) || 'Unbekannte Übung'}</p>
      </div>
      <ZahlFeld
        label="Gewicht (kg)"
        wert={gewicht}
        onChange={setGewicht}
        schritt={2.5}
        minimum={0}
        einheit="kg"
        inputMode="decimal"
        ungueltig={fehler.gewicht !== undefined}
      />
      {fehler.gewicht && (
        <p role="alert" className="text-sm text-danger">
          {fehler.gewicht}
        </p>
      )}
      <ZahlFeld
        label="Wiederholungen"
        wert={wiederholungen}
        onChange={setWiederholungen}
        schritt={1}
        minimum={1}
        einheit="Wiederholung"
        inputMode="numeric"
        ungueltig={fehler.wiederholungen !== undefined}
      />
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
      <Pressable variant="secondary" type="button" className="w-full" onClick={onClose}>
        Abbrechen
      </Pressable>
      {/* Abgesetzt: direkt neben „Abbrechen“ war ein Fehltipp ein gelöschter Satz. Keine Rückfrage
          mehr: ein Satz lässt sich im Toast zurückholen (Re-Audit 26.10.2026). */}
      <div className="flex flex-col gap-2 border-t border-text-muted/15 pt-4">
        {loeschFehler && (
          <p role="alert" className="text-sm text-danger">
            Satz konnte nicht gelöscht werden.
          </p>
        )}
        <Pressable
          variant="danger"
          type="button"
          className="w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onDelete(set.id)
            } catch {
              setLoeschFehler(true)
              setBusy(false)
              return
            }
            onClose()
            showToast('Satz gelöscht.', 'success', {
              label: 'Rückgängig',
              onClick: () => void onRestore(set).catch(() => showToast('Satz konnte nicht zurückgeholt werden.', 'error')),
            })
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <VitaIcon name="delete" tone="mono" size={20} />
            Satz löschen
          </span>
        </Pressable>
      </div>
    </form>
  )
}

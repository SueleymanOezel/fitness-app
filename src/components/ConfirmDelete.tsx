import { useState, type ReactNode } from 'react'
import Dialog from './Dialog'
import Pressable from './Pressable'
import { VitaIcon } from './icons/VitaIcon'
import { cardClass } from '../lib/ui-classes'

type Props = {
  /** Beschriftung des Auslöse-Buttons, z. B. „Löschen“ oder „Entfernen“. */
  label: string
  titel: string
  text?: string
  /** Beschriftung des Bestätigen-Buttons; absichtlich anders als `label`, damit beide eindeutig ansprechbar sind. */
  bestaetigen?: string
  /** Wirft → Fehler im Dialog, Dialog bleibt offen. Löst auf → Dialog schließt. */
  onConfirm: () => Promise<void>
  className?: string
  icon?: ReactNode
}

/**
 * Einheitliches Lösch-Muster (Block 3b): Danger-Button, der erst nach einer
 * Bestätigung im Dialog löscht. Fehler stehen im Dialog, nicht im Toast — ein
 * Toast läge hinter dem Top-Layer des offenen <dialog>. Der Inhalt wird nur
 * gerendert, solange der Dialog offen ist, damit Fehler und `busy` bei jedem
 * Öffnen frisch sind (Dialog.tsx hält seine Kinder immer gemountet).
 */
export default function ConfirmDelete({ label, titel, text, bestaetigen = 'Endgültig löschen', onConfirm, className, icon }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Pressable variant="danger" className={className} type="button" onClick={() => setOpen(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          {icon ?? <VitaIcon name="delete" tone="mono" size={20} />}
          {label}
        </span>
      </Pressable>
      <Dialog open={open} onClose={() => setOpen(false)}>
        {open && (
          <ConfirmForm
            titel={titel}
            text={text}
            bestaetigen={bestaetigen}
            onConfirm={onConfirm}
            onClose={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  )
}

function ConfirmForm({
  titel,
  text,
  bestaetigen,
  onConfirm,
  onClose,
}: { titel: string; text?: string; bestaetigen: string; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState(false)

  async function confirm() {
    if (busy) return
    setFehler(false)
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      setFehler(true)
      setBusy(false)
    }
  }

  return (
    <div className={cardClass}>
      <h2>{titel}</h2>
      {text && <p className="text-text-muted">{text}</p>}
      {fehler && (
        <p role="alert" className="text-sm text-danger">
          Das hat nicht geklappt. Bitte erneut versuchen.
        </p>
      )}
      <Pressable variant="danger" type="button" className="w-full" disabled={busy} onClick={confirm}>
        {bestaetigen}
      </Pressable>
      <Pressable variant="secondary" type="button" className="w-full" onClick={onClose}>
        Abbrechen
      </Pressable>
    </div>
  )
}

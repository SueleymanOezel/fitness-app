import { ProfileWeightSyncError } from '../hooks/use-body-metrics'
import { today, type BodyMetricRow, type BodyMetricValues } from '../lib/body-metrics'
import BodyEntryForm from './BodyEntryForm'
import { latestValue } from '../lib/body-change'
import Dialog from './Dialog'
import { useToast } from './ToastProvider'

type Props = {
  open: boolean
  onClose: () => void
  rows: BodyMetricRow[]
  saveEntry: (datum: string, values: BodyMetricValues) => Promise<void>
}

/** "Heute eintragen" for body values: on the body dashboard and straight from the weight tile on Home. */
export default function BodyEntryDialog({ open, onClose, rows, saveEntry }: Props) {
  const showToast = useToast()
  return (
    // Dialog keeps its children mounted even while closed (see Dialog.tsx) —
    // rendering the form only while open forces a fresh prefill from the
    // current rows each time it opens, instead of showing the last
    // attempt's leftover draft.
    <Dialog open={open} onClose={onClose}>
      {open && (
        <BodyEntryForm
          // The upsert writes all seven columns, so an empty form would blank
          // everything already recorded today. Correcting the day means
          // starting from what is stored, not from blanks.
          entry={rows.find((row) => row.datum === today())}
          letztesGewicht={latestValue(rows, 'gewicht')?.value ?? null}
          onSave={async (datum, values) => {
            try {
              await saveEntry(datum, values)
            } catch (err) {
              // The entry was already written and the list already reloaded;
              // only the profiles mirror failed. Resolve normally so the
              // dialog closes without its own "not saved" alert — the dialog
              // is already gone by the time this notice appears, so it is
              // short-lived feedback on a completed action, not a blocking
              // form error, hence a toast rather than inline.
              if (err instanceof ProfileWeightSyncError) {
                showToast('Eintrag gespeichert. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.', 'error')
                return
              }
              throw err
            }
          }}
          onClose={onClose}
        />
      )}
    </Dialog>
  )
}

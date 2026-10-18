import { useState } from 'react'
import Pressable from './Pressable'
import type { SessionSet } from '../hooks/use-workout-session'
import { interactiveClass, labelClass } from '../lib/ui-classes'
import { zahlDe } from '../lib/zahl'

/**
 * The sets of one exercise as a read-only table (Satz | kg | Wdh. | RIR).
 * Warm-ups appear as rows ("Aufw."); the visible number counts working sets
 * only, like the "Satz N von M" status line in the live session — satz_nummer
 * also counts warm-ups (see workingSetCount). A row opens the correction dialog.
 * Used by the live session and the history detail.
 */
export default function LoggedSets({ sets, onEdit }: { sets: SessionSet[]; onEdit: (set: SessionSet) => void }) {
  // Snapshot beim Aufklappen: nur danach erfasste Sätze blenden ein.
  const [bekannteIds] = useState(() => new Set(sets.map((set) => set.id)))
  if (sets.length === 0) return null

  // Reihenfolge wie erfasst (satz_nummer zählt alle Sätze); die sichtbare Nummer
  // zählt nur Arbeitssätze, Aufwärmsätze tragen "Aufw." (siehe workingSetCount).
  const sortiert = [...sets].sort((a, b) => a.satz_nummer - b.satz_nummer)
  const nummern = new Map<string, number>()
  const aufwaermNummern = new Map<string, number>()
  let arbeitssaetze = 0
  let aufwaermsaetze = 0
  for (const set of sortiert) {
    if (set.ist_aufwaermsatz) aufwaermNummern.set(set.id, (aufwaermsaetze += 1))
    else nummern.set(set.id, (arbeitssaetze += 1))
  }

  return (
    <table aria-label="Erfasste Sätze" className="w-full text-left tabular-nums">
      <thead>
        <tr className={labelClass}>
          <th className="py-1 font-medium">Satz</th>
          <th className="py-1 font-medium">kg</th>
          <th className="py-1 font-medium">Wdh.</th>
          <th className="py-1 font-medium">RIR</th>
        </tr>
      </thead>
      <tbody>
        {sortiert.map((set) => {
          const label = set.ist_aufwaermsatz ? 'Aufw.' : String(nummern.get(set.id))
          return (
            // Der Zeilenklick öffnet die Korrektur; der Button in der ersten Zelle ist der
            // Zugang für Tastatur und Screenreader — sein Klick steigt zum <tr> auf und
            // hat bewusst keinen eigenen Handler (sonst öffnete der Dialog doppelt).
            <tr
              key={set.id}
              onClick={() => onEdit(set)}
              className={`cursor-pointer border-t border-text-muted/20 ${set.ist_aufwaermsatz ? 'text-text-muted' : ''} ${
                bekannteIds.has(set.id) ? '' : 'row-in'
              }`}
            >
              <td className="py-1">
                <Pressable
                  variant="bare"
                  type="button"
                  className={`min-h-11 min-w-11 rounded-lg text-left focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${interactiveClass}`}
                  aria-label={
                    set.ist_aufwaermsatz
                      ? `Aufw. ${aufwaermNummern.get(set.id)} bearbeiten`
                      : `Satz ${label} bearbeiten`
                  }
                >
                  {label}
                </Pressable>
              </td>
              <td className="py-1">{set.gewicht == null ? '—' : zahlDe(set.gewicht)}</td>
              <td className="py-1">{set.wiederholungen ?? '—'}</td>
              <td className="py-1">{set.rir ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

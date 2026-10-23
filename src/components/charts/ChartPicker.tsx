import { useEffect, useRef, useState } from 'react'
import { useProfile } from '../../hooks/use-profile'
import { parseAuswahl, toggleAuswahl } from '../../lib/analysis/auswahl'
import { CHART_IDS, chartsFor, type Bereich } from '../../lib/analysis/registry'
import { cardClass, checkLabelClass, listClass } from '../../lib/ui-classes'
import Pressable from '../Pressable'

/**
 * The pinned charts, read from and written back to `profiles.analyse_auswahl`.
 *
 * updateProfile serializes its writes: two boxes ticked in quick succession
 * would otherwise race, and the losing PATCH would silently become the stored
 * value.
 */
// Hook and checkbox are one unit by design (see brief); this only affects fast refresh.
// eslint-disable-next-line react-refresh/only-export-components
export function useChartSelection(userId: string) {
  return useChartSelectionFor(useProfile(userId))
}

/**
 * Same as useChartSelection for a page that already holds the profile: a
 * second useProfile would send the same request twice for the same screen.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useChartSelectionFor({
  profile,
  updateProfile,
}: Pick<ReturnType<typeof useProfile>, 'profile' | 'updateProfile'>) {
  const [fehler, setFehler] = useState('')
  /** Pin checkboxes only show while the user is customizing the dashboard — not as clutter on every card. */
  const [anpassen, setAnpassen] = useState(false)

  const auswahl = parseAuswahl(profile?.analyse_auswahl, CHART_IDS)

  /**
   * What was last sent, not what was last rendered.
   *
   * Two boxes ticked inside one round-trip render from the same `auswahl`:
   * building the next list from that closure would let the second write erase
   * the first. The ref carries the in-flight list forward and is re-synced
   * whenever the stored selection actually changes.
   */
  const zuletztGesendet = useRef(auswahl)
  useEffect(() => {
    zuletztGesendet.current = parseAuswahl(profile?.analyse_auswahl, CHART_IDS)
  }, [profile?.analyse_auswahl])

  async function umschalten(id: string) {
    setFehler('')
    const naechste = toggleAuswahl(zuletztGesendet.current, id)
    zuletztGesendet.current = naechste
    try {
      await updateProfile({ analyse_auswahl: naechste })
    } catch {
      // The write did not land, so the stored selection is still the old one.
      zuletztGesendet.current = parseAuswahl(profile?.analyse_auswahl, CHART_IDS)
      setFehler('Auswahl konnte nicht gespeichert werden.')
    }
  }

  return { auswahl, istGewaehlt: (id: string) => auswahl.includes(id), umschalten, fehler, anpassen, setAnpassen }
}

export default function ChartPicker({
  id,
  auswahl,
}: {
  id: string
  auswahl: ReturnType<typeof useChartSelection>
}) {
  // `=== false`, not falsy: the pages always pass the real hook value; a bare selection object (tests) keeps the box.
  if (auswahl.anpassen === false) return null
  return (
    <label className={checkLabelClass}>
      <input
        type="checkbox"
        checked={auswahl.istGewaehlt(id)}
        onChange={() => auswahl.umschalten(id)}
      />
      Auf dem Dashboard zeigen
    </label>
  )
}

/** Switches the pin checkboxes on the analysis page on and off. */
export function AnpassenSchalter({ auswahl }: { auswahl: ReturnType<typeof useChartSelection> }) {
  return (
    <div className="flex flex-col gap-2">
      <Pressable
        variant="secondary"
        type="button"
        className="self-start"
        aria-pressed={auswahl.anpassen}
        onClick={() => auswahl.setAnpassen(!auswahl.anpassen)}
      >
        {auswahl.anpassen ? 'Fertig' : 'Dashboard anpassen'}
      </Pressable>
      {auswahl.anpassen && (
        <p className="text-sm text-text-muted">Hake die Graphen an, die auf deinem Dashboard erscheinen sollen.</p>
      )}
    </div>
  )
}

/** While customizing: one short list of every chart of the area instead of the charts themselves — choosing is faster than scrolling 4000 px. */
export function AnpassenListe({ bereich, auswahl }: { bereich: Bereich; auswahl: ReturnType<typeof useChartSelection> }) {
  return (
    <div className={cardClass}>
      <ul role="list" aria-label="Graphen auf dem Dashboard" className={listClass}>
        {chartsFor(bereich).map((chart) => (
          <li key={chart.id}>
            <label className={checkLabelClass}>
              <input type="checkbox" checked={auswahl.istGewaehlt(chart.id)} onChange={() => auswahl.umschalten(chart.id)} />
              {chart.titel}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

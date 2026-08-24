import { useEffect, useRef, useState } from 'react'
import { useProfile } from '../../hooks/use-profile'
import { parseAuswahl, toggleAuswahl } from '../../lib/analysis/auswahl'
import { CHART_IDS } from '../../lib/analysis/registry'

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
  const { profile, updateProfile } = useProfile(userId)
  const [fehler, setFehler] = useState('')

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

  return { auswahl, istGewaehlt: (id: string) => auswahl.includes(id), umschalten, fehler }
}

export default function ChartPicker({
  id,
  auswahl,
}: {
  id: string
  auswahl: ReturnType<typeof useChartSelection>
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={auswahl.istGewaehlt(id)}
        onChange={() => auswahl.umschalten(id)}
      />
      Auf dem Dashboard zeigen
    </label>
  )
}

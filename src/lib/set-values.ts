import { parseDecimal } from './parse-decimal'

export const WIEDERHOLUNGEN_FEHLER = 'Bitte Wiederholungen angeben (ganze Zahl, mindestens 1).'
export const GEWICHT_FEHLER = 'Gewicht als Zahl ab 0 eingeben, z. B. 22,5.'

export type SetInputValues = { gewicht: number | null; wiederholungen: number }

export type SetInputResult =
  | { ok: true; values: SetInputValues }
  | { ok: false; fehler: { gewicht?: string; wiederholungen?: string } }

/**
 * Die eine Regel für einen Satz (Erfassen, Korrigieren in der Session): Wiederholungen
 * sind Pflicht (ganze Zahl ab 1), das Gewicht ist optional (Eigengewicht) und ab 0.
 * Beide Felder werden geprüft, damit der Nutzer alle Fehler auf einmal sieht.
 */
export function parseSetInput(gewicht: string, wiederholungen: string): SetInputResult {
  const gewichtWert = parseDecimal(gewicht)
  const wiederholungenWert = parseDecimal(wiederholungen, { integer: true })

  const fehler: { gewicht?: string; wiederholungen?: string } = {}
  if (gewichtWert === undefined || (gewichtWert !== null && gewichtWert < 0)) {
    fehler.gewicht = GEWICHT_FEHLER
  }
  if (wiederholungenWert == null || wiederholungenWert < 1) {
    fehler.wiederholungen = WIEDERHOLUNGEN_FEHLER
  }
  if (fehler.gewicht !== undefined || fehler.wiederholungen !== undefined) {
    return { ok: false, fehler }
  }
  return {
    ok: true,
    values: { gewicht: gewichtWert as number | null, wiederholungen: wiederholungenWert as number },
  }
}

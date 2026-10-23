import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import { kraftverlauf, uebungenImZeitraum } from './training-charts'
import { wochenStart } from './wochen'
import { zahlDe } from '../zahl'

/**
 * The evening question in up to three sentences, before any chart: did I
 * train, did I do more, did I get stronger? Each sentence only appears when
 * the data can answer it — no "0 % mehr" from an empty week.
 */
export function trainingsErkenntnisse(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  heute: Date = new Date(),
): string[] {
  const diese = wochenStart(heute.toISOString())
  const [jahr, monat, tag] = diese.split('-').map(Number)
  const letzte = wochenStart(new Date(jahr, monat - 1, tag - 7, 12).toISOString())
  const woche = (session: AnalysisSession) =>
    session.beendet_am == null || session.gestartet_am == null ? null : wochenStart(session.gestartet_am)

  const saetze: string[] = []
  const zaehle = (montag: string) => sessions.filter((session) => woche(session) === montag).length
  const nDiese = zaehle(diese)
  const nLetzte = zaehle(letzte)
  if (nDiese > 0 || nLetzte > 0) {
    saetze.push(
      `Diese Woche ${nDiese} ${nDiese === 1 ? 'Training' : 'Trainings'}, letzte Woche ${nLetzte}.`,
    )
  }

  const wocheJeSession = new Map(sessions.map((session) => [session.id, woche(session)]))
  const volumen = (montag: string) =>
    sets
      .filter((satz) => !satz.ist_aufwaermsatz && wocheJeSession.get(satz.workout_session_id) === montag)
      .reduce((summe, satz) => summe + (satz.gewicht ?? 0) * (satz.wiederholungen ?? 0), 0)
  const vDiese = volumen(diese)
  const vLetzte = volumen(letzte)
  if (vDiese > 0) {
    const vergleich =
      vLetzte > 0 ? `, ${vDiese >= vLetzte ? '+' : '−'}${Math.round(Math.abs(vDiese / vLetzte - 1) * 100)} % zur Vorwoche` : ''
    saetze.push(`Volumen diese Woche ${Math.round(vDiese)} kg${vergleich}.`)
  }

  let bester: { name: string; delta: number } | null = null
  for (const option of uebungenImZeitraum(sets)) {
    const punkte = kraftverlauf(sessions, sets, option.exercise_id)
    if (punkte.length < 2) continue
    const delta = punkte[punkte.length - 1].wert - punkte[0].wert
    if (delta > 0 && (bester == null || delta > bester.delta)) bester = { name: option.name, delta }
  }
  if (bester) {
    saetze.push(`Stärkster Fortschritt: ${bester.name}, +${zahlDe(bester.delta, 1)} kg geschätztes 1RM im Zeitraum.`)
  }
  return saetze
}

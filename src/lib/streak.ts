import { localDay } from './local-time'

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Vorheriger Kalendertag ueber lokale Kalenderfelder statt Millisekunden-
 * Subtraktion — dieselbe Vorsicht wie home-charts.ts's naechsterTag: ein
 * Millisekunden-Sprung driftet ueber einen Sommerzeitwechsel um eine Stunde.
 */
function vorherigerTag(tag: string): string {
  const [jahr, monat, tagZahl] = tag.split('-').map(Number)
  const vorher = new Date(jahr, monat - 1, tagZahl - 1)
  return `${vorher.getFullYear()}-${pad(vorher.getMonth() + 1)}-${pad(vorher.getDate())}`
}

/**
 * Aufeinanderfolgende Trainingstage bis heute, rueckwaerts gezaehlt. Dieselbe
 * "Trainingstag"-Definition wie in home-charts.ts's aktivitaetsraster:
 * mindestens eine Session mit gesetztem `beendet_am` an diesem Kalendertag.
 *
 * Hat heute noch kein Training stattgefunden, bricht das den Streak nicht
 * sofort — die Zaehlung beginnt dann bei gestern. Ohne diese Ausnahme wuerde
 * die Home-Karte morgens, bevor trainiert wurde, immer "0 Tage" zeigen, obwohl
 * der Streak faktisch noch intakt ist.
 */
export function aktuellerStreak(sessions: { beendet_am: string | null }[], heute: string): number {
  const trainingstage = new Set<string>()
  for (const session of sessions) {
    if (session.beendet_am != null) trainingstage.add(localDay(session.beendet_am))
  }

  let tag = trainingstage.has(heute) ? heute : vorherigerTag(heute)
  let anzahl = 0
  while (trainingstage.has(tag)) {
    anzahl += 1
    tag = vorherigerTag(tag)
  }
  return anzahl
}

/** Einheitlicher Text an beiden Stellen, die den Streak zeigen (Home-Karte, Abschluss-Screen). */
export function streakText(streak: number): string {
  if (streak === 0) return 'Noch kein Trainingstag.'
  if (streak === 1) return 'Erster Trainingstag.'
  return `${streak} Tage in Folge`
}

// The first-start dialog shows once per device until it is finished or dismissed; after that the
// "Erste Schritte" card on Home carries what is still open. Device-local like the activity notice:
// a dismissed welcome needs no column in the database.
const schluessel = (userId: string) => `vl-erststart-gesehen:${userId}`

export function erststartGesehen(userId: string): boolean {
  try {
    return localStorage.getItem(schluessel(userId)) === '1'
  } catch {
    // Storage blocked (private mode): never pop up on every visit.
    return true
  }
}

export function merkeErststartGesehen(userId: string) {
  try {
    localStorage.setItem(schluessel(userId), '1')
  } catch {
    // Without storage the dialog simply shows again next time.
  }
}

// Once goal, plan, a weigh-in and a meal were all there at the same time, the checklist is done for
// good on this device; a later deleted plan gets the normal empty state, not the checklist again.
const fertigSchluessel = (userId: string) => `vl-erste-schritte-fertig:${userId}`

export function ersteSchritteFertig(userId: string): boolean {
  try {
    return localStorage.getItem(fertigSchluessel(userId)) === '1'
  } catch {
    return true
  }
}

export function merkeErsteSchritteFertig(userId: string) {
  try {
    localStorage.setItem(fertigSchluessel(userId), '1')
  } catch {
    // Without storage the checklist decides from the data alone.
  }
}

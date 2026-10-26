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

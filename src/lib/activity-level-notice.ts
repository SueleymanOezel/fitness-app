// Since 26.10.2026 the activity level means everyday life without sport (sport is added from the
// logged workouts). A level saved before meant "including sport"; until the profile is saved once
// more the app asks to pick it again. Device-local on purpose: no migration touches the user's data.
const schluessel = (userId: string) => `vl-aktivitaet-ohne-sport:${userId}`

export function aktivitaetNeuGewaehlt(userId: string): boolean {
  try {
    return localStorage.getItem(schluessel(userId)) === '1'
  } catch {
    // Storage blocked (private mode): do not nag on every view.
    return true
  }
}

export function merkeAktivitaetGewaehlt(userId: string) {
  try {
    localStorage.setItem(schluessel(userId), '1')
  } catch {
    // Without storage the notice simply shows again next time.
  }
}

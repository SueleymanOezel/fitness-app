/** Browser-tab and screen-reader title of a route, so a page change is announced (WCAG 2.4.2). */
export function seitenTitel(pathname: string): string {
  return `${seitenName(pathname)} · VitaLoop`
}

function seitenName(pathname: string): string {
  const feste: Record<string, string> = {
    '/': 'Home',
    '/login': 'Einloggen',
    '/reset-password': 'Neues Passwort',
    '/home/analyse': 'Gesamtanalyse',
    '/training': 'Training',
    '/training/plans': 'Meine Pläne',
    '/training/plans/new': 'Neuer Plan',
    '/training/exercises': 'Übungen',
    '/training/history': 'Trainingshistorie',
    '/training/analyse': 'Trainingsanalyse',
    '/nutrition': 'Ernährung',
    '/nutrition/entries': 'Einträge heute',
    '/nutrition/analyse': 'Ernährungsanalyse',
    '/body': 'Körper',
    '/body/entries': 'Verlauf',
    '/body/photos': 'Fortschrittsfotos',
    '/body/analyse': 'Körperanalyse',
    '/profile': 'Profil',
    '/profile/konto-loeschen': 'Konto löschen',
  }
  if (pathname in feste) return feste[pathname]
  if (/^\/training\/plans\/[^/]+$/.test(pathname)) return 'Plan bearbeiten'
  if (/^\/training\/session\/[^/]+$/.test(pathname)) return 'Training läuft'
  if (/^\/training\/history\/[^/]+$/.test(pathname)) return 'Trainingseinheit'
  return 'Seite nicht gefunden'
}

/** Where the back arrow in the header leads from a sub page; null on the top-level screens. */
export function parentRoute(pathname: string): { to: string; label: string } | null {
  const trainings = { to: '/training', label: 'Zurück zum Training' }
  const plaene = { to: '/training/plans', label: 'Zurück zu meinen Plänen' }
  if (/^\/training\/plans\/[^/]+$/.test(pathname)) return plaene
  if (/^\/training\/history\/[^/]+$/.test(pathname)) return { to: '/training/history', label: 'Zurück zur Historie' }
  if (/^\/training\/(plans|exercises|history|analyse|session\/[^/]+)$/.test(pathname)) return trainings
  if (/^\/nutrition\/(entries|analyse)$/.test(pathname)) return { to: '/nutrition', label: 'Zurück zur Ernährung' }
  if (/^\/body\/(entries|photos|analyse)$/.test(pathname)) return { to: '/body', label: 'Zurück zum Körperbereich' }
  if (pathname === '/home/analyse') return { to: '/', label: 'Zurück zur Übersicht' }
  return null
}

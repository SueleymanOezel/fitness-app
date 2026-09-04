/** `2026-08-24` → `24.08.` — das Jahr steht schon im Zeitraum. */
export function tagesLabel(tag: string) {
  const [, monat, tagesZahl] = tag.split('-')
  return `${tagesZahl}.${monat}.`
}

/** `2026-08-17` → `17.08.2026` — mit Jahr, wo der Zeitraum es nicht mitliefert. */
export function datumsLabel(tag: string) {
  const [jahr, monat, tagesZahl] = tag.split('-')
  return `${tagesZahl}.${monat}.${jahr}`
}

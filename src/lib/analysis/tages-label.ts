/** `2026-08-24` → `24.08.` — das Jahr steht schon im Zeitraum. */
export function tagesLabel(tag: string) {
  const [, monat, tagesZahl] = tag.split('-')
  return `${tagesZahl}.${monat}.`
}

const pad = (value: number) => String(value).padStart(2, '0')

/** `timestamptz` → the value a `datetime-local` input expects, in local time. */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * `datetime-local` → ISO. Built from the local calendar parts rather than by
 * appending a zone to the string: the input carries no offset, and guessing one
 * shifts every entry near a day boundary onto the wrong day.
 *
 * Returns `null` instead of throwing when `value` is empty or malformed — the
 * field has no `required`, so a caller must be able to turn this into a
 * user-facing validation message rather than an uncaught TypeError.
 */
export function fromLocalInputValue(value: string): string | null {
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return null

  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  if (![year, month, day, hours, minutes].every(Number.isFinite)) return null

  const date = new Date(year, month - 1, day, hours, minutes)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/** `timestamptz` → the local calendar day it falls on, as `YYYY-MM-DD`. */
export function localDay(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

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
 */
export function fromLocalInputValue(value: string): string {
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes).toISOString()
}

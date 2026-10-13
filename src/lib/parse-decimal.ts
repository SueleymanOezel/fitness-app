/**
 * Reads a number typed into a plain text field, accepting the German decimal
 * comma. Empty stays null (unset, not 0); anything unreadable is undefined so
 * the caller can refuse it instead of silently storing nothing. The allowed
 * range is the caller's business.
 */
export function parseDecimal(value: string, { integer = false } = {}): number | null | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return null
  // Number() alone would accept '1e3', '0x10' and 'Infinity'; only plain digits are user input here.
  if (!/^-?\d+([.,]\d+)?$/.test(trimmed)) return undefined
  const parsed = Number(trimmed.replace(',', '.'))
  return integer && !Number.isInteger(parsed) ? undefined : parsed
}

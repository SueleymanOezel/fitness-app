/**
 * Every number the user reads, written the German way: "72,5" not "72.5".
 * No thousands separator: the same text goes back into input fields, and
 * "1.000" would read as one there (parseDecimal takes the dot as a decimal point).
 */
export function zahlDe(wert: number, stellen = 2): string {
  return wert.toLocaleString('de-DE', { maximumFractionDigits: stellen, useGrouping: false })
}

/** For chart tooltips, whose value type also allows strings and arrays. */
export function tooltipZahl(wert: unknown): string {
  return typeof wert === 'number' ? zahlDe(wert, 1) : String(wert ?? '')
}

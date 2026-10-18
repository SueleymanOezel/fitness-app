/** "32 min" below an hour, "1 h 05 min" above — a running workout reads as time, not as 659 minutes. */
export function dauerText(minuten: number): string {
  const ganz = Math.max(0, Math.floor(minuten))
  if (ganz < 60) return `${ganz} min`
  return `${Math.floor(ganz / 60)} h ${String(ganz % 60).padStart(2, '0')} min`
}

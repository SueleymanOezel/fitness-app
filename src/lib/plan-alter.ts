const MS_PRO_WOCHE = 7 * 24 * 60 * 60 * 1000

/** Full weeks elapsed since createdAt, floored — 6 days in is still week 0. */
export function wochenAktiv(createdAt: string, now: Date): number {
  const vergangeneMs = now.getTime() - new Date(createdAt).getTime()
  return Math.floor(vergangeneMs / MS_PRO_WOCHE)
}

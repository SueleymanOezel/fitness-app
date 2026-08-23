export type PlanDay = { id: string; reihenfolge: number }

/**
 * No calendar backs this — the day after the one last completed for this
 * plan is the only signal available, so a missing or deleted last day
 * restarts the rotation at the first day rather than guessing.
 */
export function nextTrainingDay(days: PlanDay[], lastCompletedDayId: string | null): PlanDay | null {
  if (days.length === 0) return null

  const sorted = [...days].sort((a, b) => a.reihenfolge - b.reihenfolge)
  if (lastCompletedDayId === null) return sorted[0]

  const index = sorted.findIndex((day) => day.id === lastCompletedDayId)
  if (index === -1) return sorted[0]

  return sorted[(index + 1) % sorted.length]
}

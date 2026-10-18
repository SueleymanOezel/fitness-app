/** Deutscher Name, sonst der englische Quellname, sonst leer (gelöschte Übung). */
export function exerciseName(exercise: { name: string; name_de?: string | null } | null | undefined): string {
  return exercise?.name_de || exercise?.name || ''
}

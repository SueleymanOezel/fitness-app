export function collectUniqueStrings(exercises: { name: string; anleitung: string[] | null }[]): string[] {
  const strings = new Set<string>()
  for (const exercise of exercises) {
    strings.add(exercise.name)
    for (const satz of exercise.anleitung ?? []) strings.add(satz)
  }
  return [...strings]
}

export type TranslationUpdate = { id: string; name_de: string; anleitung_de: string[] | null }

export function buildTranslationUpdate(
  exercise: { id: string; name: string; anleitung: string[] | null },
  translations: Map<string, string>,
): TranslationUpdate | null {
  const nameDe = translations.get(exercise.name)
  if (nameDe === undefined) return null

  let anleitungDe: string[] | null = null
  if (exercise.anleitung !== null) {
    const translated = exercise.anleitung.map((satz) => translations.get(satz))
    anleitungDe = translated.every((satz): satz is string => satz !== undefined) ? (translated as string[]) : null
  }

  return { id: exercise.id, name_de: nameDe, anleitung_de: anleitungDe }
}

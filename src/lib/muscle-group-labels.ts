/**
 * German labels for the 17 muscle-group values that exist in
 * exercises.muskelgruppen_primaer/muskelgruppen_sekundaer (imported verbatim
 * from free-exercise-db, see scripts/import-exercises.ts). The source data
 * is English-only; this is a small, fixed vocabulary, so a static mapping
 * table is enough (no translation API).
 */
const MUSKELGRUPPE_LABEL: Record<string, string> = {
  abdominals: 'Bauch',
  abductors: 'Abduktoren',
  adductors: 'Adduktoren',
  biceps: 'Bizeps',
  calves: 'Waden',
  chest: 'Brust',
  forearms: 'Unterarme',
  glutes: 'Gesäß',
  hamstrings: 'hintere Oberschenkel',
  lats: 'Latissimus',
  'lower back': 'unterer Rücken',
  'middle back': 'mittlerer Rücken',
  neck: 'Nacken',
  quadriceps: 'Quadrizeps',
  shoulders: 'Schultern',
  traps: 'Trapezmuskel',
  triceps: 'Trizeps',
}

/** Falls back to the raw value for anything outside the known 17 (e.g. a future re-import with a new muscle group). */
export function muskelgruppeLabel(value: string): string {
  return MUSKELGRUPPE_LABEL[value] ?? value
}

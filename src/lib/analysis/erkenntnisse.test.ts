import { describe, expect, it } from 'vitest'
import { trainingsErkenntnisse } from './erkenntnisse'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'

// Thursday 22.10.2026; this week began Monday 19.10., last week 12.10.
const heute = new Date(2026, 9, 22, 12)
const session = (id: string, tag: string): AnalysisSession => ({
  id,
  gestartet_am: new Date(`${tag}T18:00:00`).toISOString(),
  beendet_am: new Date(`${tag}T19:00:00`).toISOString(),
  gesamt_kalorien: 300,
})
const satz = (sessionId: string, gewicht: number, wiederholungen: number, ist_aufwaermsatz = false): AnalysisSet => ({
  id: `${sessionId}-${gewicht}`,
  workout_session_id: sessionId,
  exercise_id: 'bank',
  exercise_name: 'Bankdrücken',
  muskelgruppen: ['chest'],
  satz_nummer: 1,
  gewicht,
  wiederholungen,
  ist_aufwaermsatz,
})

describe('trainingsErkenntnisse', () => {
  it('compares this week with last week and names the biggest strength gain', () => {
    const sessions = [session('a', '2026-10-13'), session('b', '2026-10-20'), session('c', '2026-10-21')]
    const sets = [satz('a', 70, 8), satz('b', 70, 8), satz('c', 75, 8), satz('c', 40, 10, true)]
    expect(trainingsErkenntnisse(sessions, sets, heute)).toEqual([
      'Diese Woche 2 Trainings, letzte Woche 1.',
      'Volumen diese Woche 1160 kg, +107 % zur Vorwoche.',
      'Stärkster Fortschritt: Bankdrücken, +6,3 kg geschätztes 1RM im Zeitraum.',
    ])
  })

  it('says nothing it cannot back up', () => {
    expect(trainingsErkenntnisse([], [], heute)).toEqual([])
    // One session only: no comparison, no progress.
    const nurEine = trainingsErkenntnisse([session('b', '2026-10-20')], [satz('b', 70, 8)], heute)
    expect(nurEine).toEqual(['Diese Woche 1 Training, letzte Woche 0.', 'Volumen diese Woche 560 kg.'])
  })
})

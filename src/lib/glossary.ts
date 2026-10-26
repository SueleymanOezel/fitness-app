/**
 * Every term the app shows without explaining it in place, written once: the
 * "?" next to a number (HilfeKnopf) and the help page read the same text, so
 * the two can never disagree (re-audit 26.10.2026: "Kennzahlen unerklärt").
 * Each text says how the app computes the number, not textbook theory.
 */
export const BEGRIFFE = {
  einsRM: {
    titel: 'Geschätztes 1RM',
    text: 'Das Gewicht, das du wahrscheinlich genau einmal schaffen würdest. Die App schätzt es aus deinen Sätzen: Gewicht × (1 + Wiederholungen ÷ 30). So lassen sich Sätze mit verschieden vielen Wiederholungen vergleichen.',
  },
  volumen: {
    titel: 'Volumen',
    text: 'Gewicht × Wiederholungen, über alle Arbeitssätze zusammengezählt. Aufwärmsätze zählen nicht mit. Steigt das Volumen über die Wochen, trainierst du mehr.',
  },
  rir: {
    titel: 'RIR',
    text: 'Wiederholungen in Reserve: wie viele Wiederholungen noch gegangen wären. 0 heißt, es ging keine mehr.',
  },
  trend: {
    titel: 'Gewichts-Trend',
    text: 'Ein geglätteter Verlauf deiner Wiegungen. Schwankungen durch Wasser oder Essen fallen weniger ins Gewicht; ein Wert zählt nach einer Woche nur noch halb. Achte auf den Trend, nicht auf einzelne Tage.',
  },
  wochenImPlan: {
    titel: 'Wochen in Folge',
    text: 'So viele Wochen hintereinander hast du so oft trainiert, wie dein aktiver Plan vorsieht (ohne Plan: einmal pro Woche). Die laufende Woche zählt mit, sobald ihr Ziel erreicht ist.',
  },
  tagesbedarf: {
    titel: 'Tagesbedarf',
    text: 'Was dein Körper an einem Tag ohne Sport verbraucht: der Grundumsatz aus Alter, Größe, Gewicht und Geschlecht (Formel nach Mifflin-St Jeor) mal dem Faktor deines Alltags.',
  },
  abstandZumBedarf: {
    titel: 'Abstand zum Bedarf',
    text: 'So viele kcal pro Tag isst du unter deinem Bedarf (abnehmen) oder darüber (zunehmen). Bedarf plus Abstand ergibt dein Tagesziel.',
  },
  trainingsKcal: {
    titel: 'Trainings-kcal',
    text: 'Was ein Training zusätzlich verbrennt, geschätzt aus Dauer, Körpergewicht und Art der Übungen (MET-Werte). Am Trainingstag kommen sie auf dein Tagesziel drauf.',
  },
} as const

export type Begriff = keyof typeof BEGRIFFE

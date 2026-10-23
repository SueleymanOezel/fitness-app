/**
 * Chart titles, kept apart from the chart components themselves.
 *
 * The registry (`registry.ts`) needs each chart's title to label the picker
 * and the analysis pages, and used to import it straight from the chart
 * component module. That module also imports recharts, and the registry is
 * reachable from `ChartPicker`, which every dashboard renders eagerly — so
 * that single string pulled the whole ~136 kB chart library into the entry
 * bundle regardless of any lazy loading elsewhere. This module has no such
 * weight: the chart components and the registry both import the title from
 * here, so there is still exactly one place a title is written, just no
 * longer one that drags recharts along with it.
 */
export const TRAININGSFREQUENZ_TITEL = 'Trainingsfrequenz'
export const KRAFTVERLAUF_TITEL = 'Kraftverlauf (geschätztes 1RM)'
export const VOLUMEN_JE_UEBUNG_TITEL = 'Volumen je Übung (kg)'
export const BESTES_SATZGEWICHT_TITEL = 'Bestes Satzgewicht (kg)'
export const KALORIEN_PRO_TAG_TITEL = 'Kalorien pro Tag (kcal)'
export const MAKRO_VERTEILUNG_HEUTE_TITEL = 'Makro-Verteilung heute'
export const MAKRO_VERLAUF_TITEL = 'Makro-Verlauf (g)'
export const KALORIEN_JE_ABSCHNITT_TITEL = 'Kalorien je Mahlzeiten-Abschnitt'
export const WOCHENSCHNITT_TITEL = 'Wochenschnitt (kcal pro Tag)'
export const GEWICHTSVERLAUF_TITEL = 'Gewichtsverlauf (kg)'
export const WIEDERHOLUNGEN_JE_SATZ_TITEL = 'Wiederholungen je Satz'
export const VOLUMEN_JE_MUSKELGRUPPE_TITEL = 'Volumen je Muskelgruppe (kg)'
export const DAUER_UND_KALORIEN_TITEL = 'Dauer und Kalorien'
export const REKORDE_TITEL = 'Persönliche Rekorde'
export const KALORIENBILANZ_TITEL = 'Kalorienbilanz (kcal)'
export const UMFAENGE_TITEL = 'Umfänge im Verlauf (cm)'
export const AENDERUNGSRATE_TITEL = 'Änderungsrate (kg pro Woche)'
export const GEWICHT_UEBER_KALORIEN_TITEL = 'Gewicht über Kalorien'
export const FOTOS_TITEL = 'Fortschrittsfotos'
export const AKTIVITAETSRASTER_TITEL = 'Aktivitätsraster'
export const WOCHEN_KURZFORM_TITEL = 'Wochen-Kurzform'
export const TRENDS_TITEL = 'Trends'
export const FOKUS_JE_MUSKELGRUPPE_TITEL = 'Fokus je Muskelgruppe'

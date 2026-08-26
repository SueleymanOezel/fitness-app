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
export const KRAFTVERLAUF_TITEL = 'Kraftverlauf'
export const VOLUMEN_JE_UEBUNG_TITEL = 'Volumen je Übung'
export const BESTES_SATZGEWICHT_TITEL = 'Bestes Satzgewicht'
export const KALORIEN_PRO_TAG_TITEL = 'Kalorien pro Tag'
export const GEWICHTSVERLAUF_TITEL = 'Gewichtsverlauf'
export const WIEDERHOLUNGEN_JE_SATZ_TITEL = 'Wiederholungen je Satz'
export const VOLUMEN_JE_MUSKELGRUPPE_TITEL = 'Volumen je Muskelgruppe'
export const DAUER_UND_KALORIEN_TITEL = 'Dauer und Kalorien'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Profile } from '../hooks/use-profile'
import { calculateCalorieGoal, calculateTdee, type CalorieGoalInput } from '../lib/nutrition-goal'
import { AKTIVITAET, GESCHLECHT, RANGES, ZIEL, parseNumber } from '../lib/profile-fields'
import { merkeAktivitaetGewaehlt } from '../lib/activity-level-notice'
import { cardClass, fieldLabelClass, inputClass, labelClass } from '../lib/ui-classes'
import Dialog from './Dialog'
import Chip from './Chip'
import Pressable, { PressableLink } from './Pressable'

type Props = {
  open: boolean
  onClose: () => void
  profile: Profile
  updateProfile: (patch: Partial<Profile>) => Promise<void>
  /** With a plan already there, the third step (plan assistant) is skipped. */
  hatPlan: boolean
  /** Set while there is no weigh-in yet: the weight typed here becomes the first one. */
  ersteWiegung: ((gewicht: number) => Promise<void>) | null
}

type Draft = { alter: string; groesse: string; gewicht: string; geschlecht: string; aktivitaet: string; ziel: string; delta: string }

/** The body values, or null while one is missing or out of range. */
function koerper(draft: Draft) {
  const alter = parseNumber(draft.alter, RANGES.alter)
  const groesse = parseNumber(draft.groesse, RANGES.groesse)
  const gewicht = parseNumber(draft.gewicht, RANGES.aktuelles_gewicht)
  if (alter == null || groesse == null || gewicht == null || !draft.geschlecht || !draft.aktivitaet) return null
  return { alter, groesse, gewicht }
}

/**
 * First start in three short steps (re-audit 26.10.2026: "kein Erststart für Fremde"): body values,
 * the goal with the daily target computed live, then the plan assistant or "Später". Everything is
 * skippable; what stays open shows up in the "Erste Schritte" card on Home.
 */
export default function ErststartDialog({ open, onClose, profile, updateProfile, hatPlan, ersteWiegung }: Props) {
  const [schritt, setSchritt] = useState<1 | 2 | 3>(1)
  const [draft, setDraft] = useState<Draft>(() => ({
    alter: profile.alter?.toString() ?? '',
    groesse: profile.groesse?.toString() ?? '',
    gewicht: profile.aktuelles_gewicht?.toString() ?? '',
    geschlecht: profile.geschlecht ?? '',
    aktivitaet: profile.aktivitaetslevel ?? '',
    ziel: profile.ziel ?? 'abnehmen',
    delta: profile.ziel_delta_kcal ? String(profile.ziel_delta_kcal) : '400',
  }))
  const [fehler, setFehler] = useState<string | null>(null)
  const [speichert, setSpeichert] = useState(false)
  const [geprueft, setGeprueft] = useState(false)
  const schritte = hatPlan ? 2 : 3
  const titelRef = useRef<HTMLHeadingElement>(null)
  const ersterSchritt = useRef(true)

  // A new step replaces the form under the focus; the new title takes it, so a screen reader hears where it is.
  useEffect(() => {
    if (ersterSchritt.current) {
      ersterSchritt.current = false
      return
    }
    titelRef.current?.focus()
  }, [schritt])

  function set<K extends keyof Draft>(feld: K, wert: string) {
    setDraft((alt) => ({ ...alt, [feld]: wert }))
    setFehler(null)
  }

  const werte = koerper(draft)
  // Which body field is missing or out of range, in form order: marked at the field, not only in a summary.
  const ungueltig = [
    ['alter', `Alter (${RANGES.alter[0]}–${RANGES.alter[1]})`, typeof parseNumber(draft.alter, RANGES.alter) !== 'number'],
    ['groesse', `Größe (${RANGES.groesse[0]}–${RANGES.groesse[1]} cm)`, typeof parseNumber(draft.groesse, RANGES.groesse) !== 'number'],
    ['gewicht', `Gewicht (${RANGES.aktuelles_gewicht[0]}–${RANGES.aktuelles_gewicht[1]} kg)`, typeof parseNumber(draft.gewicht, RANGES.aktuelles_gewicht) !== 'number'],
    ['geschlecht', 'Geschlecht', !draft.geschlecht],
    ['aktivitaet', 'Alltag', !draft.aktivitaet],
  ] as const
  const falsch = (feld: string) => (geprueft && ungueltig.some(([name, , fehlt]) => name === feld && fehlt)) || undefined
  const delta = draft.ziel === 'halten' ? 0 : parseNumber(draft.delta, RANGES.ziel_delta_kcal)
  const eingabe: CalorieGoalInput | null =
    werte && delta != null
      ? {
          alter: werte.alter,
          groesse: werte.groesse,
          aktuelles_gewicht: werte.gewicht,
          geschlecht: draft.geschlecht as CalorieGoalInput['geschlecht'],
          aktivitaetslevel: draft.aktivitaet as CalorieGoalInput['aktivitaetslevel'],
          ziel: draft.ziel as CalorieGoalInput['ziel'],
          ziel_delta_kcal: delta,
        }
      : null
  const bedarf = eingabe && calculateTdee(eingabe)
  const ziel = eingabe && calculateCalorieGoal(eingabe)

  function weiter(event: FormEvent) {
    event.preventDefault()
    if (!werte) {
      const offen = ungueltig.filter(([, , fehlt]) => fehlt)
      setGeprueft(true)
      setFehler(`Bitte noch ausfüllen: ${offen.map(([, label]) => label).join(', ')}.`)
      document.getElementById(`erststart-${offen[0][0]}`)?.focus()
      return
    }
    setSchritt(2)
  }

  async function speichern(event: FormEvent) {
    event.preventDefault()
    if (!eingabe || !werte) {
      setFehler(`Bitte einen Abstand von ${RANGES.ziel_delta_kcal[0]} bis ${RANGES.ziel_delta_kcal[1]} kcal eingeben.`)
      document.getElementById('erststart-delta')?.focus()
      return
    }
    setSpeichert(true)
    try {
      await updateProfile({
        alter: eingabe.alter,
        groesse: eingabe.groesse,
        aktuelles_gewicht: eingabe.aktuelles_gewicht,
        geschlecht: eingabe.geschlecht,
        aktivitaetslevel: eingabe.aktivitaetslevel,
        ziel: eingabe.ziel,
        ziel_delta_kcal: eingabe.ziel_delta_kcal,
      })
    } catch {
      setSpeichert(false)
      setFehler('Konnte nicht gespeichert werden. Bitte erneut versuchen.')
      return
    }
    // Picked under the new meaning (everyday life without sport): no "pick again" notice.
    merkeAktivitaetGewaehlt(profile.id)
    // The goal is saved; a failed first weigh-in only leaves "Erstes Gewicht" open on Home.
    await ersteWiegung?.(werte.gewicht).catch(() => {})
    setSpeichert(false)
    if (hatPlan) onClose()
    else setSchritt(3)
  }

  const kopf = (titel: string) => (
    <>
      <p className={labelClass}>{`Schritt ${schritt} von ${schritte}`}</p>
      <h2 ref={titelRef} tabIndex={-1} className="focus:outline-none">
        {titel}
      </h2>
    </>
  )
  const spaeter = (
    <Pressable variant="secondary" type="button" onClick={onClose}>
      Später
    </Pressable>
  )

  return (
    <Dialog open={open} onClose={onClose}>
      {schritt === 1 && (
        <form onSubmit={weiter} className="flex flex-col gap-4" noValidate>
          <div className={cardClass}>
            {kopf('Willkommen bei VitaLoop')}
            <p>Drei kurze Schritte, dann rechnet die App dein Tagesziel aus.</p>
            <label className={fieldLabelClass}>
              Alter (Jahre)
              <input id="erststart-alter" aria-invalid={falsch('alter')} aria-describedby={falsch('alter') && 'erststart-fehler'} className={inputClass} type="number" inputMode="numeric" value={draft.alter} onChange={(e) => set('alter', e.target.value)} />
            </label>
            <label className={fieldLabelClass}>
              Größe (cm)
              <input id="erststart-groesse" aria-invalid={falsch('groesse')} aria-describedby={falsch('groesse') && 'erststart-fehler'} className={inputClass} type="number" inputMode="decimal" step="any" value={draft.groesse} onChange={(e) => set('groesse', e.target.value)} />
            </label>
            <label className={fieldLabelClass}>
              Gewicht heute (kg)
              <input id="erststart-gewicht" aria-invalid={falsch('gewicht')} aria-describedby={falsch('gewicht') && 'erststart-fehler'} className={inputClass} type="number" inputMode="decimal" step="any" value={draft.gewicht} onChange={(e) => set('gewicht', e.target.value)} />
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className={`${fieldLabelClass} mb-1.5`}>Geschlecht (für den Grundumsatz)</legend>
              <div className="flex gap-2">
                {GESCHLECHT.map(([wert, label], index) => (
                  <Chip
                    key={wert}
                    id={index === 0 ? 'erststart-geschlecht' : undefined}
                    aria-describedby={falsch('geschlecht') && 'erststart-fehler'}
                    active={draft.geschlecht === wert}
                    onClick={() => set('geschlecht', wert)}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <label className={fieldLabelClass}>
              Dein Alltag (ohne Sport)
              <select id="erststart-aktivitaet" aria-invalid={falsch('aktivitaet')} aria-describedby={falsch('aktivitaet') && 'erststart-fehler'} className={inputClass} value={draft.aktivitaet} onChange={(e) => set('aktivitaet', e.target.value)}>
                <option value="">bitte wählen</option>
                {AKTIVITAET.map(([wert, label]) => (
                  <option key={wert} value={wert}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p className="-mt-1 text-sm text-text-muted">Deine Trainings rechnet die App aus den Einheiten dazu.</p>
            {fehler && (
              <p id="erststart-fehler" role="alert">
                {fehler}
              </p>
            )}
          </div>
          <Pressable variant="primary" type="submit">
            Weiter
          </Pressable>
          {spaeter}
        </form>
      )}
      {schritt === 2 && (
        <form onSubmit={speichern} className="flex flex-col gap-4" noValidate>
          <div className={cardClass}>
            {kopf('Dein Ziel')}
            <fieldset className="flex flex-col gap-1.5">
              <legend className={`${fieldLabelClass} mb-1.5`}>Was hast du vor?</legend>
              <div className="flex flex-wrap gap-2">
                {ZIEL.map(([wert, label]) => (
                  <Chip key={wert} active={draft.ziel === wert} onClick={() => set('ziel', wert)}>
                    {label}
                  </Chip>
                ))}
              </div>
            </fieldset>
            {draft.ziel !== 'halten' && (
              <>
                <label className={fieldLabelClass}>
                  Abstand zum Bedarf (kcal pro Tag)
                  <input
                    id="erststart-delta"
                    className={inputClass}
                    type="number"
                    inputMode="numeric"
                    aria-invalid={(fehler != null && delta == null) || undefined}
                    aria-describedby={fehler != null && delta == null ? 'erststart-delta-hinweis erststart-fehler' : 'erststart-delta-hinweis'}
                    value={draft.delta}
                    onChange={(e) => set('delta', e.target.value)}
                  />
                </label>
                <p id="erststart-delta-hinweis" className="-mt-1 text-sm text-text-muted">
                  So viel weniger (oder mehr) als dein Bedarf pro Tag. 300–500 sind üblich.
                </p>
              </>
            )}
            {bedarf != null && ziel != null && (
              // Live: the target follows every change, before anything is saved.
              <p aria-live="polite" className="rounded-2xl bg-surface-raised p-4">
                <span className={`${labelClass} block`}>Dein Tagesziel</span>
                <span className="font-display block text-3xl font-bold tabular-nums">{`${ziel.toLocaleString('de-DE')} kcal`}</span>
                <span className={`${labelClass} block`}>
                  {`Bedarf ${Math.round(bedarf).toLocaleString('de-DE')} kcal${delta ? ` ${draft.ziel === 'abnehmen' ? '−' : '+'} ${delta} kcal` : ''}, an Trainingstagen kommt das Training dazu.`}
                </span>
              </p>
            )}
            {fehler && (
              <p id="erststart-fehler" role="alert">
                {fehler}
              </p>
            )}
          </div>
          <Pressable variant="primary" type="submit" disabled={speichert}>
            {speichert ? 'Speichert …' : 'Ziel speichern'}
          </Pressable>
          <Pressable variant="secondary" type="button" onClick={() => setSchritt(1)}>
            Zurück
          </Pressable>
        </form>
      )}
      {schritt === 3 && (
        <div className="flex flex-col gap-4">
          <div className={cardClass}>
            {kopf('Dein Trainingsplan')}
            <p>Dein Tagesziel steht. Jetzt noch ein Plan: Der Assistent stellt ihn aus deinen Trainingstagen und Geräten zusammen.</p>
          </div>
          <PressableLink variant="primary" to="/training/plans/new" onClick={onClose}>
            Plan zusammenstellen
          </PressableLink>
          {spaeter}
        </div>
      )}
    </Dialog>
  )
}

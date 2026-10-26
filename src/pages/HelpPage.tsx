import { BEGRIFFE } from '../lib/glossary'
import { cardClass, labelClass, linkClass } from '../lib/ui-classes'
import { PressableLink } from '../components/Pressable'

/** Steps of a first week, each with the place where it happens; the button names match the app's. */
const SCHRITTE = [
  { text: 'Profil ausfüllen: Aus Alter, Größe, Gewicht und Alltag berechnet die App dein Tagesziel.', to: '/profile', link: 'Zum Profil' },
  { text: 'Essen eintragen: „Eintrag hinzufügen“, dann suchen, Barcode scannen oder selbst anlegen.', to: '/nutrition', link: 'Zur Ernährung' },
  { text: 'Plan anlegen: „Neuer Plan“ stellt aus deinen Tagen und Geräten einen Plan zusammen.', to: '/training/plans', link: 'Zu meinen Plänen' },
  { text: 'Trainieren: „Training starten“ führt dich Satz für Satz durch, mit Pausen-Timer.', to: '/training', link: 'Zum Training' },
  { text: 'Wiegen: Unter Körper „Heute eintragen“. Am besten morgens, dann zeigt der Trend am meisten.', to: '/body', link: 'Zum Körper' },
] as const

/** The help entry the re-audit missed (26.10.2026): how to start, and every term the app uses. */
export default function HelpPage() {
  return (
    <div>
      <h1>Hilfe</h1>
      <section className="flex flex-col gap-3">
        <h2>So fängst du an</h2>
        <ol role="list" className="flex flex-col gap-3">
          {SCHRITTE.map((schritt, index) => (
            <li key={schritt.to} className={`${cardClass} flex flex-col`}>
              <p>
                <span className={`${labelClass} mr-2`}>{index + 1}.</span>
                {schritt.text}
              </p>
              <PressableLink to={schritt.to} className={`${linkClass} self-start`}>
                {schritt.link}
              </PressableLink>
            </li>
          ))}
        </ol>
      </section>
      <section className="flex flex-col gap-3">
        <h2>Begriffe</h2>
        <dl className={`${cardClass} flex flex-col gap-4`}>
          {Object.values(BEGRIFFE).map((begriff) => (
            <div key={begriff.titel}>
              <dt className="font-semibold">{begriff.titel}</dt>
              <dd className="text-text-muted">{begriff.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

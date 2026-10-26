import { useEffect, useState } from 'react'
import PageHero from './PageHero'
import { PressableLink } from './Pressable'
import { VitaIcon } from './icons/VitaIcon'
import type { OffeneSession } from '../hooks/use-workout-session'
import { dauerText } from '../lib/dauer'

/**
 * A workout that is still running wins over "what's next": Home and Training
 * offer to resume it instead of suggesting the following plan day.
 */
export default function OpenSessionHero({ offen }: { offen: OffeneSession }) {
  const [jetzt, setJetzt] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setJetzt(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])
  const minuten = Math.max(0, Math.floor((jetzt - new Date(offen.gestartet_am).getTime()) / 60000))

  return (
    <PageHero
      label="Training läuft"
      bereich="training"
      titel={offen.tag_name ?? 'Training'}
      untertitel={`seit ${dauerText(minuten)}`}
      action={
        <PressableLink variant="primary" to={`/training/session/${offen.id}`}>
          <span className="inline-flex items-center justify-center gap-2">
            <VitaIcon name="start" tone="mono" size={20} />
            Fortsetzen
          </span>
        </PressableLink>
      }
    />
  )
}

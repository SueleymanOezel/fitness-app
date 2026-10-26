import type { ReactNode } from 'react'
import { cardClass, labelClass, listClass, rowLinkClass } from '../lib/ui-classes'
import Pressable, { PressableLink } from './Pressable'

export type ErsterSchritt = { label: string; erledigt: boolean; to?: string; onClick?: () => void }

/** What a new account still lacks, on Home until the basics are in place; each open step leads there. */
export default function ErsteSchritte({ schritte }: { schritte: ErsterSchritt[] }) {
  const erledigt = schritte.filter((schritt) => schritt.erledigt).length
  return (
    <section className={cardClass} aria-labelledby="erste-schritte">
      <h2 id="erste-schritte">Erste Schritte</h2>
      <p className={labelClass}>{`${erledigt} von ${schritte.length} erledigt`}</p>
      <ul role="list" className={listClass}>
        {schritte.map((schritt) => (
          <li key={schritt.label}>
            {schritt.erledigt ? (
              <p className="flex min-h-11 items-center gap-3 text-text-muted">
                <Haken erledigt />
                <span className="line-through">{schritt.label}</span>
                <span className="sr-only">(erledigt)</span>
              </p>
            ) : (
              <Zeile schritt={schritt}>
                <Haken erledigt={false} />
                <span>{schritt.label}</span>
                <span aria-hidden="true" className="ml-auto text-text-muted">
                  ›
                </span>
              </Zeile>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Zeile({ schritt, children }: { schritt: ErsterSchritt; children: ReactNode }) {
  if (schritt.to) {
    return (
      <PressableLink to={schritt.to} className={`${rowLinkClass} w-full`}>
        {children}
      </PressableLink>
    )
  }
  return (
    <Pressable variant="bare" type="button" className={`${rowLinkClass} w-full text-left`} onClick={schritt.onClick}>
      {children}
    </Pressable>
  )
}

function Haken({ erledigt }: { erledigt: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        erledigt ? 'bg-chart-mint text-on-bright' : 'border-2 border-text-muted/40'
      }`}
    >
      {erledigt ? '✓' : ''}
    </span>
  )
}

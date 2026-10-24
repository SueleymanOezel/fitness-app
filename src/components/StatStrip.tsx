import type { ReactNode } from 'react'
import { interactiveClass, tileClass, tileLabelClass, tileValueClass } from '../lib/ui-classes'
import Pressable, { PressableLink } from './Pressable'

export type StatTile = {
  label: string
  wert: string
  hinweis?: string
  balken?: { anteil: number; farbe: string }
  /** A tile that leads somewhere (`to`) or opens something (`onClick`); a chevron says it is tappable. */
  to?: string
  onClick?: () => void
}

export default function StatStrip({ tiles }: { tiles: StatTile[] }) {
  return (
    <ul role="list" className="flex gap-2">
      {tiles.map((tile) => (
        <li key={tile.label} className="min-w-0 flex-1">
          <Kachel tile={tile}>
            {/* spans, not <p>: a tile can be a <button>, which only takes phrasing content */}
            <span className={`${tileLabelClass} flex justify-between gap-2`}>
              {tile.label}
              {(tile.to || tile.onClick) && <span aria-hidden="true">›</span>}
            </span>
            <span className={`${tileValueClass} block`}>{tile.wert}</span>
            {tile.hinweis && <span className={`${tileLabelClass} block`}>{tile.hinweis}</span>}
            {tile.balken && (
              <span className="block h-1.5 rounded-full bg-surface-raised">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.round(Math.min(1, Math.max(0, tile.balken.anteil)) * 100)}%`,
                    backgroundColor: tile.balken.farbe,
                  }}
                />
              </span>
            )}
          </Kachel>
        </li>
      ))}
    </ul>
  )
}

function Kachel({ tile, children }: { tile: StatTile; children: ReactNode }) {
  const klasse = `${tileClass} h-full`
  // text-text: as a link the tile would inherit the link lilac, which belongs to actions only.
  const tippbar = `${klasse} block w-full text-left text-text ${interactiveClass}`
  if (tile.to) {
    return (
      <PressableLink to={tile.to} className={tippbar}>
        {children}
      </PressableLink>
    )
  }
  if (tile.onClick) {
    return (
      <Pressable variant="bare" type="button" className={tippbar} onClick={tile.onClick}>
        {children}
      </Pressable>
    )
  }
  return <div className={klasse}>{children}</div>
}

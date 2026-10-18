import { tileClass, tileLabelClass, tileValueClass } from '../lib/ui-classes'

export type StatTile = {
  label: string
  wert: string
  hinweis?: string
  balken?: { anteil: number; farbe: string }
}

export default function StatStrip({ tiles }: { tiles: StatTile[] }) {
  return (
    <ul role="list" className="flex gap-2">
      {tiles.map((tile) => (
        <li key={tile.label} className="min-w-0 flex-1">
          <div className={`${tileClass} h-full`}>
            <p className={tileLabelClass}>{tile.label}</p>
            <p className={tileValueClass}>{tile.wert}</p>
            {tile.hinweis && <p className={tileLabelClass}>{tile.hinweis}</p>}
            {tile.balken && (
              <div className="h-1.5 rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(Math.min(1, Math.max(0, tile.balken.anteil)) * 100)}%`,
                    backgroundColor: tile.balken.farbe,
                  }}
                />
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

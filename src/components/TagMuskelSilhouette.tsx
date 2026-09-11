import { type MuskelZone, type ZonenStatus } from '../lib/muscle-zones'

type Rect = { x: number; y: number; width: number; height: number; rx?: number }
type ZonenGruppe = { zone: MuskelZone; rechtecke: Rect[] }

/**
 * Grobe Körperblöcke, keine anatomische Präzision (bewusste Vereinfachung,
 * siehe Brainstorming) — jede Gruppe deckt eine der 10 Zonen aus
 * muscle-zones.ts ab; zwei Rechtecke bei bilateralen Zonen (Arme, Beine,
 * Trizeps), die links und rechts denselben Trainingsstatus tragen.
 */
const VORNE: ZonenGruppe[] = [
  { zone: 'schultern', rechtecke: [{ x: 6, y: 26, width: 48, height: 10, rx: 4 }] },
  { zone: 'brust', rechtecke: [{ x: 20, y: 28, width: 20, height: 22, rx: 3 }] },
  {
    zone: 'arme',
    rechtecke: [
      { x: 6, y: 36, width: 10, height: 45, rx: 4 },
      { x: 44, y: 36, width: 10, height: 45, rx: 4 },
    ],
  },
  { zone: 'bauch', rechtecke: [{ x: 20, y: 50, width: 20, height: 25, rx: 3 }] },
  {
    zone: 'beineVorne',
    rechtecke: [
      { x: 16, y: 76, width: 12, height: 75, rx: 4 },
      { x: 32, y: 76, width: 12, height: 75, rx: 4 },
    ],
  },
]

const HINTEN: ZonenGruppe[] = [
  { zone: 'nackenTrapez', rechtecke: [{ x: 20, y: 24, width: 20, height: 12, rx: 3 }] },
  { zone: 'ruecken', rechtecke: [{ x: 18, y: 36, width: 24, height: 38, rx: 3 }] },
  {
    zone: 'trizeps',
    rechtecke: [
      { x: 6, y: 36, width: 10, height: 45, rx: 4 },
      { x: 44, y: 36, width: 10, height: 45, rx: 4 },
    ],
  },
  { zone: 'gesaess', rechtecke: [{ x: 18, y: 74, width: 24, height: 14, rx: 4 }] },
  {
    zone: 'beineHinten',
    rechtecke: [
      { x: 16, y: 88, width: 12, height: 63, rx: 4 },
      { x: 32, y: 88, width: 12, height: 63, rx: 4 },
    ],
  },
]

function farbeFuer(status: ZonenStatus): { fill: string; fillOpacity: number } {
  if (status === 'primary') return { fill: 'var(--color-accent-text)', fillOpacity: 1 }
  if (status === 'secondary') return { fill: 'var(--color-accent-text)', fillOpacity: 0.4 }
  return { fill: 'var(--color-surface-raised)', fillOpacity: 1 }
}

function Figur({
  gruppen,
  zonen,
  titel,
}: {
  gruppen: ZonenGruppe[]
  zonen: Record<MuskelZone, ZonenStatus>
  titel: string
}) {
  return (
    <svg viewBox="0 0 60 160" width="60" height="160" role="img" aria-label={titel}>
      <circle cx="30" cy="12" r="10" fill="var(--color-surface-raised)" />
      {gruppen.map((gruppe) => {
        const status = zonen[gruppe.zone]
        return (
          <g key={gruppe.zone} data-zone={gruppe.zone} data-level={status ?? 'untrained'} {...farbeFuer(status)}>
            {gruppe.rechtecke.map((rechteck, index) => (
              <rect key={index} {...rechteck} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

export default function TagMuskelSilhouette({ zonen }: { zonen: Record<MuskelZone, ZonenStatus> }) {
  return (
    <div className="flex gap-4">
      <Figur gruppen={VORNE} zonen={zonen} titel="Trainierte Muskelgruppen, Vorderansicht" />
      <Figur gruppen={HINTEN} zonen={zonen} titel="Trainierte Muskelgruppen, Rückansicht" />
    </div>
  )
}

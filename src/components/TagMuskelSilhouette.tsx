import { type MuskelZone, type ZonenStatus } from '../lib/muscle-zones'
import { HINTEN, MuskelSilhouetteFigur, VORNE } from './MuskelSilhouetteFigur'

function farbeFuer(status: ZonenStatus): { fill: string; fillOpacity: number } {
  if (status === 'primary') return { fill: 'var(--color-accent-text)', fillOpacity: 1 }
  if (status === 'secondary') return { fill: 'var(--color-accent-text)', fillOpacity: 0.4 }
  return { fill: 'var(--color-surface-raised)', fillOpacity: 1 }
}

export default function TagMuskelSilhouette({ zonen }: { zonen: Record<MuskelZone, ZonenStatus> }) {
  return (
    <div className="flex gap-4">
      <MuskelSilhouetteFigur
        gruppen={VORNE}
        titel="Trainierte Muskelgruppen, Vorderansicht"
        stilFuerZone={(zone) => farbeFuer(zonen[zone])}
        datenLevel={(zone) => zonen[zone] ?? 'untrained'}
      />
      <MuskelSilhouetteFigur
        gruppen={HINTEN}
        titel="Trainierte Muskelgruppen, Rückansicht"
        stilFuerZone={(zone) => farbeFuer(zonen[zone])}
        datenLevel={(zone) => zonen[zone] ?? 'untrained'}
      />
    </div>
  )
}

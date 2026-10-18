import Skeleton from './Skeleton'

/** Ladezustand eines einzelnen Graphen (Dashboards und Chart-Listen). */
export function ChartSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Lädt…</span>
      <Skeleton className="h-64" />
    </div>
  )
}

/**
 * Ladezustand einer ganzen Seite in der Form der fertigen Seite (nichts
 * springt). Der sr-only-Text hält Zugänglichkeit und Tests, die auf „Lädt…“
 * prüfen, stabil. Genau ein Wurzel-Element, damit der 24-px-Rhythmus aus
 * main > * greift.
 */
export default function PageSkeleton({
  titel,
  variante = 'dashboard',
}: {
  titel: string
  variante?: 'dashboard' | 'liste'
}) {
  return (
    <div>
      <h1>{titel}</h1>
      <div role="status" className="flex flex-col gap-6">
        <span className="sr-only">Lädt…</span>
        {variante === 'dashboard' ? (
          <>
            <Skeleton className="h-14" />
            <Skeleton className="h-44" />
            <Skeleton className="h-52" />
          </>
        ) : (
          <Skeleton className="h-56" />
        )}
      </div>
    </div>
  )
}

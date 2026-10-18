import { skeletonClass } from '../lib/ui-classes'

/** Reiner Platzhalter: vor Hilfstechnik verborgen, den Ladezustand meldet der umgebende role="status". */
export default function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`${skeletonClass} ${className}`} />
}

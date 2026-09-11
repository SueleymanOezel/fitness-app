import { VitaIcon } from './icons/VitaIcon'

/**
 * Shared 48×48 exercise thumbnail with placeholder fallback — used on the
 * exercises catalog, in the training-plan exercise picker, and in a saved
 * day's exercise list, so the three places render it identically.
 */
export default function ExerciseThumbnail({ bildUrl, className = '' }: { bildUrl: string | null; className?: string }) {
  return bildUrl ? (
    <img
      src={bildUrl}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`h-12 w-12 shrink-0 rounded-xl object-cover ${className}`}
    />
  ) : (
    <VitaIcon name="exercises" tone="mono" size={48} className={`shrink-0 ${className}`} />
  )
}

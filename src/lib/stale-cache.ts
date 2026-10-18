/**
 * Last-known data per user, kept in localStorage so a page can show something
 * immediately (menu switch, cold start, offline) while the real request runs in
 * the background. This is a convenience copy, never the source of truth: every
 * hook still reloads from Supabase and overwrites it.
 *
 * - Keys: `vl-cache:<userId>:<name>`. A name may carry a variant after `@`
 *   (`food-entries@2026-10-18`); writing a new variant removes the older ones of
 *   the same base, so one-key-per-day data does not pile up.
 * - Everything is wrapped in try/catch: storage can be blocked, full or corrupt
 *   (private mode, quota). Without it the app simply behaves as before.
 * - `cacheLeeren()` runs on sign-out: health data must not outlive the session
 *   on a shared device.
 * - Values are JSON; shortcut: no size cap beyond the browser quota (a failed
 *   write is ignored), upgrade to IndexedDB if a cached list ever grows past ~1 MB.
 */
const PREFIX = 'vl-cache:'

function schluessel(userId: string, name: string) {
  return `${PREFIX}${userId}:${name}`
}

/** `undefined` = nothing usable stored (never stored, unreadable, or no storage). */
export function cacheLesen<T>(userId: string, name: string): T | undefined {
  try {
    const roh = localStorage.getItem(schluessel(userId, name))
    return roh === null ? undefined : (JSON.parse(roh) as T)
  } catch {
    return undefined
  }
}

export function cacheSchreiben(userId: string, name: string, wert: unknown) {
  try {
    const basis = name.split('@')[0]
    if (basis !== name) {
      const vorsatz = `${PREFIX}${userId}:${basis}@`
      const neu = schluessel(userId, name)
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i)
        if (key !== null && key.startsWith(vorsatz) && key !== neu) localStorage.removeItem(key)
      }
    }
    localStorage.setItem(schluessel(userId, name), JSON.stringify(wert))
  } catch {
    // Full or blocked storage: the data just is not kept.
  }
}

export function cacheLeeren() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i)
      if (key !== null && key.startsWith(PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

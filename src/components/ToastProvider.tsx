import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import Pressable from './Pressable'

type ToastType = 'success' | 'error'
/** One button on the toast, e.g. „Rückgängig“ after a delete. */
export type ToastAction = { label: string; onClick: () => void }
type ToastState = { message: string; type: ToastType; action?: ToastAction } | null

/** Long enough to read a short sentence, short enough not to linger. */
const AUTO_DISMISS_MS = 4000
/** A toast with a button stays a little longer: reading, deciding and reaching it takes time. */
const ACTION_DISMISS_MS = 6000

type ShowToast = (message: string, type: ToastType, action?: ToastAction) => void

const ToastContext = createContext<ShowToast | null>(null)

/**
 * Mounted once in AppLayout, so every authenticated page can call useToast()
 * without its own state. Replaces the inline `<p role="alert">` pattern for
 * short-lived feedback on an action (e.g. "gespeichert") — a permanent
 * validation error in a form stays inline, since a toast that vanishes
 * mid-read would hide the reason a save was blocked.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback<ShowToast>((message, type, action) => {
    // Clear any existing pending timeout before showing a new toast
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
    }

    setToast({ message, type, action })

    // Schedule a new timeout and store its ID
    timeoutRef.current = setTimeout(() => {
      setToast(null)
      timeoutRef.current = null
    }, action ? ACTION_DISMISS_MS : AUTO_DISMISS_MS)
  }, [])

  // Clean up the timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          role="alert"
          className={`fixed inset-x-4 top-4 flex flex-row items-center gap-3 text-left rounded-2xl px-4 py-3 font-medium motion-safe:animate-[toast-in_200ms_ease-out] ${
            toast.type === 'success' ? 'bg-success text-success-ink' : 'bg-danger text-on-bright'
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          {toast.action && (
            <Pressable
              variant="bare"
              type="button"
              className="-my-2 -mr-2 min-h-11 shrink-0 rounded-xl px-3 font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              onClick={() => {
                const { onClick } = toast.action!
                if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
                timeoutRef.current = null
                setToast(null)
                onClick()
              }}
            >
              {toast.action.label}
            </Pressable>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}

/** Call with a message and 'success' or 'error' (plus an optional action) to show a toast for a few seconds. */
// Context, provider, and hook are one unit by design; splitting them would only add an import location.
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast must be used within a ToastProvider')
  return showToast
}

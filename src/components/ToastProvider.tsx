import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error'
type ToastState = { message: string; type: ToastType } | null

/** Long enough to read a short sentence, short enough not to linger. */
const AUTO_DISMISS_MS = 4000

const ToastContext = createContext<((message: string, type: ToastType) => void) | null>(null)

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

  const showToast = useCallback((message: string, type: ToastType) => {
    // Clear any existing pending timeout before showing a new toast
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
    }

    setToast({ message, type })

    // Schedule a new timeout and store its ID
    timeoutRef.current = setTimeout(() => {
      setToast(null)
      timeoutRef.current = null
    }, AUTO_DISMISS_MS)
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
        <p
          role="alert"
          className={`fixed inset-x-4 top-4 rounded-2xl px-4 py-3 font-medium ${
            toast.type === 'success' ? 'bg-success text-success-ink' : 'bg-danger text-text'
          }`}
        >
          {toast.message}
        </p>
      )}
    </ToastContext.Provider>
  )
}

/** Call with a message and 'success' or 'error' to show a toast for a few seconds. */
// Context, provider, and hook are one unit by design; splitting them would only add an import location.
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast must be used within a ToastProvider')
  return showToast
}

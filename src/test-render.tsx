import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider'

/**
 * Every page in the training/nutrition/body areas calls useToast(), which
 * throws outside a ToastProvider. Wrapping that once here instead of in
 * every page's test file keeps the eleven-plus call sites from duplicating
 * the same three lines. `path` is only needed for pages read via useParams.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path }: { route?: string; path?: string } = {},
) {
  const content = path ? (
    <Routes>
      <Route path={path} element={ui} />
    </Routes>
  ) : (
    ui
  )
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>{content}</ToastProvider>
    </MemoryRouter>,
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted, Latin subset only (covers ä ö ü ß): no third-party font request, CSP stays font-src 'self'.
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow-semi-condensed/latin-600.css'
import '@fontsource/barlow-semi-condensed/latin-700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline shell (public/../pwa/sw.template.js). Only in the production build: the dev server serves
// unhashed modules a worker could not cache sensibly.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Without a worker the app still runs online; nothing to tell the user.
    })
  })
}

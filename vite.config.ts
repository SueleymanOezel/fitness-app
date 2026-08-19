import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev:mobile` serves over HTTPS on the local network so a phone can
// reach the app: getUserMedia (the barcode scanner) only runs in a secure
// context, and plain http:// over the LAN is not one. Plain `npm run dev` stays
// http on localhost, which counts as secure and needs no certificate prompt.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'mobile' ? [basicSsl()] : [])],
  server: mode === 'mobile' ? { host: true } : {},
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    env: {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
}))

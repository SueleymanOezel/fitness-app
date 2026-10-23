import { createClient } from '@supabase/supabase-js'
import { AUTH_STORAGE_KEY } from './stored-session'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL. Copy .env.example to .env and fill in your Supabase project values.',
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.',
  )
}

// Same key supabase-js would pick on its own (no one gets signed out); explicit so useSession reads the same entry.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: AUTH_STORAGE_KEY },
})

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const TIMEOUT_MS = 8000          // reads: an unreachable database must surface as an error state, not an endless skeleton
const FUNCTION_TIMEOUT_MS = 40000   // Edge Functions call the model and need longer than a read

export const supabaseConfigured = Boolean(url && anonKey)

// Read-only client. The anon key is public by design; row-level security on the project allows select only.
// Every request carries a timeout so an unreachable database surfaces as an error state instead of an endless skeleton.
export const supabase = createClient(url ?? 'https://invalid.example', anonKey ?? 'missing', {
  global: {
    fetch: (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      return fetch(input, { ...init, signal: AbortSignal.timeout(url.includes('/functions/v1/') ? FUNCTION_TIMEOUT_MS : TIMEOUT_MS) })
    },
  },
})

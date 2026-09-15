import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

// Read-only client. The anon key is public by design; row-level security on the project allows select only.
export const supabase = createClient(url ?? 'https://invalid.local', anonKey ?? 'missing')

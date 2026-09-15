// Shared helpers for the language-model scripts. Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local.
import { readFileSync } from 'node:fs'

export function env() {
  const out = {}
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim()
  }
  if (!out.VITE_SUPABASE_URL || !out.VITE_SUPABASE_ANON_KEY) throw new Error('.env.local needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  return out
}

export async function rest(e, path) {
  const r = await fetch(`${e.VITE_SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: e.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${e.VITE_SUPABASE_ANON_KEY}` } })
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`)
  return r.json()
}

export async function draft(e, register_id, task = 'draft_supplier_message', force = false) {
  const r = await fetch(`${e.VITE_SUPABASE_URL}/functions/v1/draft-action`, { method: 'POST', headers: { apikey: e.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${e.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ register_id, task, force }) })
  return { status: r.status, ...(await r.json()) }
}

export async function spent(e) {
  const rows = await rest(e, 'mvp_llm_calls?select=est_cost_usd')
  return rows.reduce((s, r) => s + Number(r.est_cost_usd ?? 0), 0)
}

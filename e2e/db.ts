import { execFileSync } from 'node:child_process'

// Test-only setup through the linked Supabase CLI (the repo is linked to the project). Findings keep their ids across
// reruns, so a test that creates a task resets it here first. The app itself writes only through security-definer functions.
export function sql(query: string): string {
  for (let attempt = 1; ; attempt++) {
    try {
      return execFileSync('supabase', ['db', 'query', '--linked', query], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (e) {
      if (attempt >= 3) throw e   // the CLI's login role fails now and then
    }
  }
}

// Rows of a query, for assertions that must not depend on a shared, busy run log.
export function sqlRows(query: string): Record<string, unknown>[] {
  const out = sql(query)
  const body = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1))
  return (body.rows ?? []) as Record<string, unknown>[]
}

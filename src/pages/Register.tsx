import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { EvidenceDrawer } from '../components/EvidenceDrawer'
import { columns, RegisterTable } from '../components/RegisterTable'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { copy } from '../copy'
import { enabledAgents } from '../lib/agents'
import { getRegisterLatest, getRegisterTotals, runAgent, type RegisterRow } from '../lib/data'
import { getNames } from '../lib/names'
import { periodLabel, usePeriod } from '../lib/period'
import { useQuery } from '../lib/useQuery'

const PAGE = 50
const ROLES = ['Einkäufer', 'Kategorieeinkauf', 'Finanzen', 'Qualität']
const chip = 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-widest transition-colors duration-fast active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'

// Register across agents: the latest run per case for the period, filterable by the internal role a recommendation addresses.
export function Register() {
  const { period } = usePeriod()
  const [params, setParams] = useSearchParams()
  const role = params.get('role')
  const [page, setPage] = useState(0)
  const [tick, setTick] = useState(0)
  const [running, setRunning] = useState(false)
  const [selected, setSelected] = useState<RegisterRow | null>(null)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  useEffect(() => { setPage(0); setSelected(null) }, [role, period.from, period.to])

  const q = useQuery(async () => {
    const [rows, totals] = await Promise.all([getRegisterLatest(period, enabledAgents, role, page, PAGE), getRegisterTotals(period, enabledAgents, role)])
    const names = await getNames([...new Set(rows.map((r) => r.supplier_no).filter((x): x is number => x != null))], [...new Set(rows.map((r) => r.article_no).filter((x): x is number => x != null))])
    return { rows, totals, names }
  }, [period.from, period.to, role, page, tick])

  const setRole = (next: string | null) => setParams((p) => { const n = new URLSearchParams(p); if (next) n.set('role', next); else n.delete('role'); return n })
  const runAll = async () => { setRunning(true); try { for (const a of enabledAgents) await runAgent(a, period) } finally { setRunning(false); refresh() } }

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">{copy.register.title}</h1>
      <p className="mt-2 max-w-prose text-text-muted">{copy.register.subtitle}</p>
      <p className="mt-1 text-sm text-text-muted">{periodLabel(period)}</p>
      <div role="group" aria-label={copy.register.filterLabel} className="mt-6 flex flex-wrap gap-2">
        {[null, ...ROLES].map((r) => {
          const active = role === r
          return (
            <button key={r ?? 'all'} type="button" data-testid={`role-filter-${r ?? 'all'}`} aria-pressed={active} onClick={() => setRole(r)}
              className={`${chip} ${active ? 'border-ink bg-ink text-bg' : 'border-border-strong bg-surface text-text-muted hover:bg-surface-hover hover:text-text'}`}>
              {r ?? copy.register.all}
            </button>
          )
        })}
      </div>
      <div className="mt-6">
        {q.error && <ErrorState text={copy.cockpit.error} detail={q.error} />}
        {!q.error && !q.data && <Skeleton lines={8} />}
        {q.data && q.data.totals.rows === 0 && (
          role ? <EmptyState text={copy.register.emptyRole(role)} /> : (
            <div className="space-y-3">
              <EmptyState text={copy.register.empty} />
              <Button variant="primary" loading={running} onClick={runAll}>{copy.register.runAll}</Button>
            </div>
          )
        )}
        {q.data && q.data.totals.rows > 0 && (
          <RegisterTable rows={q.data.rows} names={q.data.names} cols={[columns.agent, columns.finding, columns.gap, columns.recommendation, columns.status]}
            total={q.data.totals.total} count={q.data.totals.rows} page={page} pageSize={PAGE} onPage={setPage} onRow={setSelected} selectedId={selected?.id} testId="register-all" />
        )}
      </div>
      {selected && <EvidenceDrawer row={selected} period={period} onClose={() => setSelected(null)} onStatus={(st) => { setSelected({ ...selected, status: st }); refresh() }} />}
    </section>
  )
}

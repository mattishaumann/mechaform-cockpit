import { useEffect, useState } from 'react'
import type { RegisterRow, TaskRow } from '../lib/data'
import { createTask, getTasks } from '../lib/data'
import type { Scenario } from '../lib/scenarios'
import { getScenarios } from '../lib/scenarios'
import { useQuery } from '../lib/useQuery'
import { copy } from '../copy'
import { Button } from './Button'
import { Pill } from './Pill'
import { ErrorState } from './States'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const ring = 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none'

// Who acts, named as on the Empfehlung card: buyers are numbers, Finanzen and Qualität are roles, not people.
function owner(role: string, id?: string): { name: string; note: string | null } {
  if (role === 'Einkäufer' && id) return { name: copy.reco.buyer(id), note: null }
  if (role === 'Kategorieeinkauf' && id) return { name: copy.reco.category(id), note: null }
  return { name: role, note: copy.reco.roleNote }
}

function Spark() {
  return (
    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-brand-tint">
      <svg width="14" height="14" viewBox="0 0 24 24" className="text-brand" fill="currentColor">
        <path d="M12 0c.4 6.9 4.7 11.4 12 12-7.3.6-11.6 5.1-12 12-.4-6.9-4.7-11.4-12-12 7.3-.6 11.6-5.1 12-12Z" />
      </svg>
    </span>
  )
}

function Skeleton() {
  return (
    <div role="status" aria-label={copy.cockpit.loading} className="mt-4 space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-4 rounded-lg border border-border p-4">
          <div className="h-8 w-8 animate-pulse rounded-md bg-border" />
          <div className="flex-1 space-y-2"><div className="h-4 w-3/4 animate-pulse rounded-sm bg-border" /><div className="h-4 w-1/2 animate-pulse rounded-sm bg-border" /></div>
        </div>
      ))}
    </div>
  )
}

// One row: the agent's proposal in one line, its benefit in the next; opening it shows who acts, the facts, and the action.
function ScenarioRow({ s, idx, row, tasks, onTask, onDraft }: {
  s: Scenario; idx: number; row: RegisterRow; tasks: TaskRow[] | null
  onTask: (idx: number) => Promise<void>; onDraft: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panel = `scenario-${row.id}-${idx}`
  const who = owner(s.owner_role, s.owner_id)
  const target = s.internal_idx != null ? row.recommendation?.internal[s.internal_idx] : undefined
  const task = target && tasks?.find((t) => t.role === target.role && (t.recipient_id ?? null) === (target.id ?? null))

  const pills = <>
    <Pill tone={s.how === 'idea' ? 'neutral' : 'brand'}>{copy.scenarios.how[s.how] ?? s.how}</Pill>
    {s.sample && <Pill tone="neutral">{copy.scenarios.sample}</Pill>}
  </>

  const act = async () => {
    if (s.internal_idx == null) return
    setBusy(true); setError(null)
    try { await onTask(s.internal_idx) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <li data-testid="scenario-row" data-how={s.how} className="rounded-lg border border-border bg-surface">
      <button type="button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((o) => !o)}
        className={`${ring} flex w-full items-start gap-4 rounded-lg p-4 text-left transition-[background-color] duration-fast ease-out hover:bg-surface-hover active:bg-surface-hover`}>
        <Spark />
        <span className="min-w-0 flex-1">
          <span data-testid="scenario-title" className="block text-sm font-medium text-text">{s.title}</span>
          <span data-testid="scenario-benefit" className="mt-1 block text-sm text-text-muted">{s.benefit}</span>
          <span className="mt-2 flex flex-wrap gap-2 sm:hidden">{pills}</span>
        </span>
        <span className="hidden shrink-0 flex-col items-end gap-2 sm:flex">{pills}</span>
      </button>
      {open && (
        <div id={panel} data-testid="scenario-detail" className="px-4 pb-4 sm:pl-16">
          <p className="text-sm font-medium">{who.name}{who.note && <span className="ml-2 font-normal text-text-muted">{who.note}</span>}</p>
          {s.detail && s.detail.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-text-muted">{s.detail.map((d) => <li key={d}>{d}</li>)}</ul>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {s.how === 'draft' && (row.recommendation?.external
              ? <Button variant="primary" data-testid="scenario-action" onClick={onDraft}>{copy.scenarios.createDraft}</Button>
              : <p className="text-xs text-text-muted">{copy.scenarios.noDraft}</p>)}
            {(s.how === 'task' || s.how === 'negotiation') && (task
              ? <span data-testid="scenario-task-created"><Pill tone="positive">{copy.scenarios.taskCreated}</Pill></span>
              : target
                ? <Button variant={s.how === 'negotiation' ? 'primary' : 'secondary'} data-testid="scenario-action" loading={busy} disabled={tasks === null} onClick={act}>
                    {s.how === 'negotiation' ? copy.scenarios.negotiate : copy.scenarios.createTask}
                  </Button>
                : <p className="text-xs text-text-muted">{copy.scenarios.ideaNote}</p>)}
            {s.how === 'idea' && <p className="text-xs text-text-muted">{copy.scenarios.ideaNote}</p>}
          </div>
          {error && <p role="alert" className="mt-2 text-xs text-danger-500">{copy.scenarios.taskError} {error}</p>}
        </div>
      )}
    </li>
  )
}

// Tacto's "Vorgeschlagene Szenarien" (RFQ-Insights pattern): the agent's name, the object's number as a chip, and the
// agent's own scenarios for this finding. Tasks and drafts reuse the Empfehlung card's actions. Keyed by finding in the drawer.
export function ScenarioCard({ row, onStatus, onDraft, onTaskCreated }: {
  row: RegisterRow; onStatus: (status: string) => void; onDraft: () => void; onTaskCreated: () => void
}) {
  const q = useQuery(() => getScenarios(row.id), [row.id])
  const [tasks, setTasks] = useState<TaskRow[] | null>(null)
  useEffect(() => {
    let alive = true
    getTasks(row.id).then((t) => { if (alive) setTasks(t) }).catch(() => { if (alive) setTasks([]) })
    return () => { alive = false }
  }, [row.id])

  const onTask = async (idx: number) => {
    await createTask(row.id, idx)
    setTasks(await getTasks(row.id))
    if (row.status === 'open' || row.status === 'draft_ready') onStatus('in_progress')
    onTaskCreated()
  }

  const set = q.data
  return (
    <section data-testid="scenario-card" aria-labelledby={`scn-${row.id}`} className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p data-testid="scenario-agent" className={label}>{set?.agent ?? row.case}</p>
          <h3 id={`scn-${row.id}`} className="mt-1 text-lg font-semibold">{copy.scenarios.title}</h3>
        </div>
        {set?.object_no && (
          <div className="sm:text-right">
            <p className="text-xs text-text-muted">{set.object_label}</p>
            <span data-testid="scenario-chip" className="mt-1 inline-block rounded-md border border-border-strong px-2 py-1 font-mono text-sm tabular-nums">{set.object_no}</span>
          </div>
        )}
      </div>
      {q.loading && !set && <Skeleton />}
      {q.error && <div className="mt-4"><ErrorState text={copy.scenarios.error} detail={q.error} /></div>}
      {!q.loading && !q.error && (!set || set.scenarios.length === 0) && <p data-testid="scenario-empty" className="mt-4 text-sm text-text-muted">{copy.scenarios.empty}</p>}
      {set && set.scenarios.length > 0 && (
        <ul className="mt-4 space-y-3">
          {set.scenarios.map((s, i) => <ScenarioRow key={`${i}-${s.title}`} s={s} idx={i} row={row} tasks={tasks} onTask={onTask} onDraft={onDraft} />)}
        </ul>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import type { Recipient, Recommendation, RegisterRow, TaskRow } from '../lib/data'
import { createTask, getTasks } from '../lib/data'
import { copy } from '../copy'
import { Button } from './Button'
import { Pill } from './Pill'

// Who a recommendation addresses. Buyers are numbers (no buyer master in the data); Finanzen and Qualität are roles, not people.
export function recipientLabel(r: Recipient): { name: string; note: string | null } {
  if (r.role === 'Einkäufer' && r.id) return { name: copy.reco.buyer(r.id), note: [r.plant, r.responsible ? copy.reco.responsible : null].filter(Boolean).join(', ') || null }
  if (r.role === 'Kategorieeinkauf' && r.id) return { name: copy.reco.category(r.id), note: null }
  return { name: r.role, note: copy.reco.roleNote }
}

export function SequencePill({ sequence }: { sequence: Recommendation['sequence'] }) {
  return <span data-testid="sequence-pill" data-sequence={sequence}><Pill tone="neutral">{copy.reco.sequence[sequence] ?? sequence}</Pill></span>
}

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const sameRecipient = (t: TaskRow, r: Recipient) => t.role === r.role && (t.recipient_id ?? null) === (r.id ?? null)

// One card per finding: the rule's rationale, who acts internally (tasks, no email), and the external message when there is one.
export function RecommendationCard({ row, onStatus, onDraft, draftOpen }: { row: RegisterRow; onStatus: (status: string) => void; onDraft: () => void; draftOpen: boolean }) {
  const rec = row.recommendation
  const [tasks, setTasks] = useState<TaskRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    let alive = true
    setTasks(null); setLoadError(null); setErrors({})
    getTasks(row.id).then((t) => { if (alive) setTasks(t) }).catch((e: Error) => { if (alive) setLoadError(e.message) })
    return () => { alive = false }
  }, [row.id])

  if (!rec) {
    return (
      <section data-testid="recommendation-card" className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-lg font-semibold">{copy.reco.title}</h3>
        <p data-testid="rec-empty" className="mt-2 text-sm text-text-muted">{copy.reco.empty}</p>
      </section>
    )
  }

  const add = async (idx: number) => {
    const r = rec.internal[idx]
    // optimistic: the row shows the created state at once and rolls back visibly if the database refuses
    const placeholder: TaskRow = { id: -1 - idx, register_id: row.id, case_key: '', role: r.role, recipient_id: r.id, why: r.why, due_date: '', status: 'open', created_at: '' }
    setTasks((t) => [...(t ?? []), placeholder]); setBusy(idx); setErrors((e) => ({ ...e, [idx]: '' }))
    try {
      await createTask(row.id, idx)
      setTasks(await getTasks(row.id))
      if (row.status === 'open' || row.status === 'draft_ready') onStatus('in_progress')
    } catch (e) {
      setTasks((t) => (t ?? []).filter((x) => x.id !== placeholder.id))
      setErrors((er) => ({ ...er, [idx]: (e as Error).message }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section data-testid="recommendation-card" aria-labelledby={`reco-${row.id}`} className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`reco-${row.id}`} data-testid="rec-title" className="text-lg font-semibold">{rec.title ?? copy.reco.title}</h3>
        <SequencePill sequence={rec.sequence} />
      </div>
      <p data-testid="rec-rationale" className="mt-2 max-w-prose text-sm leading-relaxed">{rec.rationale}</p>

      <div className="mt-6">
        <h4 className={label}>{copy.reco.internal}</h4>
        {loadError && <p role="alert" className="mt-2 text-sm text-danger-500">{copy.reco.tasksError} {loadError}</p>}
        <ul className="mt-1 divide-y divide-border">
          {rec.internal.map((r, i) => {
            const who = recipientLabel(r)
            const task = tasks?.find((t) => sameRecipient(t, r))
            return (
              <li key={`${r.role}-${r.id ?? ''}`} data-testid="rec-internal" data-role={r.role} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{who.name}{who.note && <span className="ml-2 font-normal text-text-muted">{who.note}</span>}</p>
                  <p className="mt-1 text-sm text-text-muted">{r.why}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {tasks === null && !loadError
                    ? <div role="status" aria-label={copy.cockpit.loading} className="h-8 w-32 animate-pulse rounded-md bg-border" />
                    : task
                      ? <span data-testid="task-created"><Pill tone="positive">{task.due_date ? copy.reco.taskCreated(task.due_date) : copy.reco.taskCreated('...')}</Pill></span>
                      : <Button data-testid="create-task" loading={busy === i} disabled={busy !== null || Boolean(loadError)} onClick={() => add(i)}>{copy.reco.createTask}</Button>}
                  {errors[i] && <p role="alert" className="text-xs text-danger-500">{copy.reco.taskError} {errors[i]}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {rec.external && (
        <div data-testid="rec-external" className="mt-4">
          <h4 className={label}>{copy.reco.external}</h4>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{rec.external.recipient}</p>
              <p className="mt-1 text-sm text-text-muted">{rec.external.document_type}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button variant="primary" data-testid="create-draft" aria-expanded={draftOpen} onClick={onDraft}>{copy.reco.createDraft}</Button>
              <p className="text-xs text-text-muted">{copy.reco.draftNote}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

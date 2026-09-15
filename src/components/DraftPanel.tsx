import { useEffect, useState } from 'react'
import type { DraftPayload, DraftResponse, OrderLine, RegisterRow } from '../lib/data'
import { draftAction, getCachedDraft, setFindingStatus } from '../lib/data'
import { copy } from '../copy'
import { Button } from './Button'
import { Pill } from './Pill'
import { ErrorState, Skeleton } from './States'

type Task = 'draft_supplier_message' | 'explain_for_cfo'
const INTERNAL = new Set(['Price Radar', 'Preferred Steering'])

// Typewriter reveal of a cached draft body, about 1.5 s in total; no streaming from the API.
function useTypewriter(text: string, active: boolean) {
  const [shown, setShown] = useState(active ? '' : text)
  useEffect(() => {
    if (!active) { setShown(text); return }
    setShown('')
    const step = Math.max(1, Math.ceil(text.length / 60))
    let i = 0
    const id = setInterval(() => { i += step; setShown(text.slice(0, i)); if (i >= text.length) clearInterval(id) }, 25)
    return () => clearInterval(id)
  }, [text, active])
  return shown
}

function Paragraph({ text, animate, onHover }: { text: string; animate: boolean; onHover: (on: boolean) => void }) {
  const shown = useTypewriter(text, animate)
  const [value, setValue] = useState(text)
  useEffect(() => setValue(text), [text])
  return (
    <textarea aria-label="Absatz" value={animate && shown.length < text.length ? shown : value} onChange={(e) => setValue(e.target.value)} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)} onFocus={() => onHover(true)} onBlur={() => onHover(false)} rows={Math.max(2, Math.ceil(text.length / 90))}
      className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg hover:border-border-strong" />
  )
}

export function DraftPanel({ row, lines, contractNo, onStatus }: { row: RegisterRow; lines: OrderLine[]; contractNo: string | null; onStatus: (status: string) => void }) {
  const internal = INTERNAL.has(row.case)
  const [task, setTask] = useState<Task>(internal ? 'explain_for_cfo' : 'draft_supplier_message')
  const [draft, setDraft] = useState<DraftPayload | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)   // budget exhausted or key missing: cached drafts only
  const [animate, setAnimate] = useState(false)
  const [highlight, setHighlight] = useState<Set<string>>(new Set())

  useEffect(() => {
    let alive = true
    setState('loading'); setMessage(null)
    getCachedDraft(row.id, task).then((c) => { if (!alive) return; if (c) { setDraft(c.payload); setAnimate(true); setState('ready') } else { setDraft(null); setState('idle') } }).catch((e: Error) => { if (alive) { setMessage(e.message); setState('error') } })
    return () => { alive = false }
  }, [row.id, task])

  const request = async (force: boolean) => {
    setState('loading'); setMessage(null)
    const res = await draftAction(row.id, task, force).catch((e: Error): DraftResponse => ({ error: e.message }))
    if (res.error === 'budget_exhausted') { setLocked(true); setMessage(copy.draft.budget); setState(draft ? 'ready' : 'idle'); return }
    if (res.error === 'missing_api_key') { setLocked(true); setMessage(copy.draft.missingKey); setState(draft ? 'ready' : 'idle'); return }
    if (res.error === 'rejected') { setMessage(`${copy.draft.rejected} ${(res.reasons ?? []).join('; ')}`); setState(draft ? 'ready' : 'error'); return }
    if (res.error || !res.draft) { setMessage(res.error ?? 'unknown'); setState('error'); return }
    setDraft(res.draft); setAnimate(true); setState('ready')
    if (!res.draft.refused && row.status === 'open') onStatus('draft_ready')
  }
  const claimsFor = (paragraph: string) => new Set((draft?.claims_used ?? []).filter((c) => paragraph.includes(c.claim.slice(0, 24)) || c.order_nos.some((o) => paragraph.includes(o))).flatMap((c) => c.order_nos))
  const markSent = async () => { await setFindingStatus(row.id, 'sent_simulated'); onStatus('sent_simulated') }

  return (
    <section data-testid="draft-panel" className="mt-4 rounded-lg border border-border bg-surface">
      <header className="border-b border-border px-5 py-4">
        <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.draft.open}</p>
        <h3 data-testid="draft-header" className="mt-1 text-lg font-semibold">{copy.draft.header}</h3>
        <p data-testid="draft-made-from" className="text-sm text-text-muted">{copy.draft.madeFrom(lines.length, contractNo)}</p>
        <p data-testid="draft-numbers-line" className="mt-1 text-sm text-text-muted">{copy.draft.numbersLine}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!internal && <Button variant={task === 'draft_supplier_message' ? 'primary' : 'secondary'} onClick={() => setTask('draft_supplier_message')}>{copy.draft.open}</Button>}
          <Button variant={task === 'explain_for_cfo' ? 'primary' : 'secondary'} onClick={() => setTask('explain_for_cfo')}>{copy.draft.cfo}</Button>
          <Button onClick={() => request(Boolean(draft))} disabled={locked || state === 'loading'} loading={state === 'loading'}>{draft ? copy.draft.redo : copy.draft.open}</Button>
          <Button onClick={markSent} disabled={row.status === 'sent_simulated' || !draft || draft.refused}>{copy.finding.markSent}</Button>
        </div>
        {message && <p role="status" data-testid="draft-message" className="mt-2 text-sm text-text-muted">{message}</p>}
      </header>
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div>
          {state === 'loading' && !draft && <Skeleton lines={6} />}
          {state === 'error' && !draft && <ErrorState text={copy.cockpit.error} detail={message ?? undefined} />}
          {state === 'idle' && !draft && <p data-testid="draft-empty" className="text-sm text-text-muted">{copy.draft.empty}</p>}
          {draft && draft.refused && <p data-testid="draft-refused" className="text-sm">{copy.draft.refused}{draft.refusal_reason}</p>}
          {draft && !draft.refused && (
            <div className="space-y-3">
              <div className="flex items-center gap-2"><Pill tone="brand">{draft.document_type}</Pill><Pill tone="neutral">{draft.language}</Pill></div>
              <p data-testid="draft-subject" className="text-sm"><span className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.draft.subject}</span> <span className="font-medium">{draft.draft.subject}</span></p>
              <p className="text-sm">{draft.draft.salutation}</p>
              {draft.draft.body.map((p, i) => <Paragraph key={`${row.id}-${task}-${i}`} text={p} animate={animate} onHover={(on) => setHighlight(on ? claimsFor(p) : new Set())} />)}
              <p className="text-sm">{draft.draft.closing}</p>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.draft.numbers}</p>
                <ul data-testid="draft-numbers" className="mt-1 flex flex-wrap gap-2">
                  {draft.numbers_used.map((n, i) => <li key={i} className="rounded-full border border-border bg-bg px-2.5 py-1 font-mono text-xs"><span data-tabular>{n.value}</span>{n.unit ? ` ${n.unit}` : ''} <span className="text-text-muted">{n.source_field}</span></li>)}
                </ul>
              </div>
              {draft.confidence_note && <p className="text-xs text-text-muted">{draft.confidence_note}</p>}
            </div>
          )}
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.draft.evidence}</p>
          <table className="mt-2 w-full text-sm">
            <thead className="text-left font-mono text-xs uppercase tracking-widest text-text-muted"><tr><th className="py-1 pr-2 font-normal">{copy.table.order}</th><th className="py-1 pr-2 font-normal">{copy.table.date}</th><th className="py-1 pr-2 text-right font-normal">{copy.table.quantity}</th><th className="py-1 text-right font-normal">{copy.table.paid}</th></tr></thead>
            <tbody>
              {lines.map((l) => <tr key={`${l.order_no}-${l.order_position}`} data-testid="draft-evidence-row" data-highlight={highlight.has(String(l.order_no)) || undefined} className="border-t border-border transition-colors duration-fast data-[highlight]:bg-brand-tint"><td className="py-1 pr-2 tabular-nums">{l.order_no}</td><td className="py-1 pr-2 tabular-nums">{l.order_date}</td><td className="py-1 pr-2 text-right tabular-nums">{l.quantity}</td><td className="py-1 text-right tabular-nums">{l.unit_price.toFixed(2)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

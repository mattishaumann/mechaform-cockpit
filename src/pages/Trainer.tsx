import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Pill } from '../components/Pill'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { copy } from '../copy'
import { getBrief, getStoredSession, getTurns, sendTurn, startLiveSession, type BriefFact, type Turn } from '../lib/trainer'
import { useQuery } from '../lib/useQuery'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const tone = { strong: 'positive', ok: 'neutral', weak: 'brand' } as const

// Three stages in one strip: where the trainer is today and where it goes.
function RoadmapStrip() {
  return (
    <section aria-label={copy.trainer.roadmap} className="mt-6">
      <ol data-testid="roadmap" className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface md:flex-row md:divide-x md:divide-y-0">
        {copy.trainer.stages.map((s, i) => (
          <li key={s.when} data-testid="roadmap-stage" aria-current={i === 0 ? 'step' : undefined} className="flex-1 p-4">
            <p className={`${label} flex items-center gap-2`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-brand' : 'bg-series-neutral'}`} />{s.when}</p>
            <p className={`mt-1 text-sm ${i === 0 ? 'text-text' : 'text-text-muted'}`}>{s.what}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

// the label above a fact already names the case; the model's copy of the fact keeps the prefix
const withoutCase = (f: BriefFact) => {
  const prefix = f.case_name ? `${f.case_name}: ` : ''
  const text = prefix && f.fact.startsWith(prefix) ? f.fact.slice(prefix.length) : f.fact
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function BriefPanel({ facts }: { facts: BriefFact[] }) {
  return (
    <aside data-testid="brief-panel" className="rounded-lg border border-border bg-surface p-5">
      <h2 className={label}>{copy.trainer.brief}</h2>
      <p className="mt-1 text-xs text-text-muted">{copy.trainer.briefNote}</p>
      <ul className="mt-4 space-y-3">
        {facts.map((f) => (
          <li key={f.fact_id} data-fact={f.fact_id} className="text-sm">
            {f.case_name && <p className={label}>{f.case_name}</p>}
            <p className="mt-1">{withoutCase(f)}</p>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function TurnView({ turn, supplier, facts, live = false }: { turn: Turn; supplier: string; facts: BriefFact[]; live?: boolean }) {
  const next = facts.find((f) => f.fact_id === turn.coach.next_fact_id)
  return (
    <article data-testid="turn" data-turn={turn.turn_no} data-live={live || undefined} className="reveal space-y-3">
      {live && <Pill tone="brand">{copy.trainer.liveTurn}</Pill>}
      <div className="rounded-lg bg-bg p-4">
        <p className={label}>{copy.trainer.you}</p>
        <p className="mt-1 max-w-prose text-sm">{turn.buyer}</p>
      </div>
      <div data-testid="supplier-reply" className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={label}>{copy.trainer.supplierRole(supplier)}</p>
          <Pill tone={turn.supplier.concession === 'none' ? 'neutral' : 'positive'}>{copy.trainer.concession[turn.supplier.concession] ?? turn.supplier.concession}</Pill>
        </div>
        <p className="mt-1 max-w-prose text-sm">{turn.supplier.message}</p>
      </div>
      <aside data-testid="coach-card" data-assessment={turn.coach.assessment} className="rounded-lg border border-border bg-brand-tint/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className={label}>{copy.trainer.coach}</p>
          <Pill tone={tone[turn.coach.assessment] ?? 'neutral'}>{copy.trainer.assessment[turn.coach.assessment] ?? turn.coach.assessment}</Pill>
        </div>
        <p className="mt-1 max-w-prose text-sm">{turn.coach.note}</p>
        <p className="mt-2 text-sm"><span className={label}>{copy.trainer.nextFact}</span> <span className="text-text-muted">{next?.fact ?? turn.coach.next_fact_id}</span></p>
      </aside>
    </article>
  )
}

// One live turn per session: branches a live session from the stored one, then locks until "Start over".
function LiveTurn({ storedId, supplier, facts }: { storedId: number; supplier: string; facts: BriefFact[] }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turn, setTurn] = useState<Turn | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const text = message.trim()
    if (!text || busy) return
    setBusy(true); setError(null); setPending(text)
    try {
      const live = await startLiveSession(storedId)
      const res = await sendTurn(live, text)
      if (res.turn) { setTurn(res.turn); setMessage('') }
      else if (res.error === 'budget_exhausted') setError(copy.trainer.budget)
      else if (res.error === 'missing_api_key') setError(copy.trainer.missingKey)
      else if (res.error === 'rejected') setError(`${copy.trainer.rejected} ${(res.reasons ?? []).join('; ')}`)
      else setError(`${copy.trainer.failed} ${res.error ?? 'unknown'}`)
    } catch (err) {
      setError(`${copy.trainer.failed} ${(err as Error).message}`)
    } finally {
      setBusy(false); setPending(null)
    }
  }

  if (turn) {
    return (
      <div className="space-y-3">
        <TurnView turn={turn} supplier={supplier} facts={facts} live />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p data-testid="live-locked" className="text-sm text-text-muted">{copy.trainer.locked}</p>
          <Button onClick={() => { setTurn(null); setError(null) }}>{copy.trainer.startOver}</Button>
        </div>
      </div>
    )
  }
  return (
    <form data-testid="live-form" onSubmit={submit} className="space-y-2">
      {pending && (
        <div className="space-y-3">
          <div className="rounded-lg bg-bg p-4"><p className={label}>{copy.trainer.you}</p><p className="mt-1 max-w-prose text-sm">{pending}</p></div>
          <div role="status" aria-label={copy.cockpit.loading} className="h-24 animate-pulse rounded-lg bg-border" />
        </div>
      )}
      <label htmlFor="live-message" className={label}>{copy.trainer.liveLabel}</label>
      <textarea id="live-message" value={message} onChange={(e) => setMessage(e.target.value)} disabled={busy} rows={3} maxLength={600} placeholder={copy.trainer.livePlaceholder}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
        className="block w-full resize-y rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text transition-colors duration-fast placeholder:text-text-muted hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50" />
      {error && <p role="alert" data-testid="live-error" className="text-sm text-danger-500">{error}</p>}
      <div className="flex justify-end"><Button type="submit" variant="primary" loading={busy} disabled={!message.trim()}>{copy.trainer.send}</Button></div>
    </form>
  )
}

export function Trainer() {
  const [shown, setShown] = useState(0)   // the presenter steps through the stored session turn by turn
  const q = useQuery(async () => {
    const [session, facts] = await Promise.all([getStoredSession(), getBrief()])
    const turns = session ? await getTurns(session.id) : []
    return { session, facts, turns }
  }, [])

  if (q.error) return <ErrorState text={copy.cockpit.error} detail={q.error} />
  if (!q.data) return <Skeleton lines={8} />
  const { session, facts, turns } = q.data
  const supplier = session?.supplier_name ?? ''
  const visible = turns.slice(0, shown)
  const done = shown >= turns.length
  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{copy.trainer.title}</h1>
        <span data-testid="preview-pill"><Pill tone="brand">{copy.trainer.preview}</Pill></span>
      </div>
      <p className="mt-2 max-w-prose text-text-muted">{copy.trainer.subtitle(supplier || 'the supplier')}</p>
      <RoadmapStrip />
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1"><BriefPanel facts={facts} /></div>
        <section data-testid="conversation" aria-label={copy.trainer.session} className="space-y-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={label}>{copy.trainer.session}{turns.length > 0 && <span className="ml-2">{shown > 0 && copy.trainer.turnOf(Math.min(shown, turns.length), turns.length)}</span>}</p>
            {turns.length > 0 && !done && (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShown(turns.length)}>{copy.trainer.showAll}</Button>
                <Button variant="primary" data-testid="next-turn" onClick={() => setShown((n) => n + 1)}>{copy.trainer.nextTurn}</Button>
              </div>
            )}
          </div>
          {!session || turns.length === 0 ? <EmptyState text={copy.trainer.empty} /> : visible.map((t) => <TurnView key={t.id} turn={t} supplier={supplier} facts={facts} />)}
          {session && turns.length > 0 && shown === 0 && <p data-testid="replay-hint" className="text-sm text-text-muted">{copy.trainer.replayHint(turns.length)}</p>}
          {session && turns.length > 0 && done && <LiveTurn storedId={session.id} supplier={supplier} facts={facts} />}
        </section>
      </div>
    </section>
  )
}

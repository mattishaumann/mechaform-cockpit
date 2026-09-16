import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Pill } from '../components/Pill'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { copy } from '../copy'
import { formatEur, formatInt, formatPct } from '../lib/format'
import { getBrief, getCandidates, getOpening, getStoredSession, getSupplierContact, getSupplierHistory, getTurns, searchSuppliers, sendTurn, startLiveSession, startTrainerSession, type BriefFact, type Candidate, type Contact, type SupplierHistory, type SupplierHit, type Turn } from '../lib/trainer'
import { useQuery } from '../lib/useQuery'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const tone = { strong: 'positive', ok: 'neutral', weak: 'brand' } as const
const CHAT_MAX = 8   // the Edge Function caps a live session at eight turns

// what the trainer needs to open a case: the supplier, and for a recommended case the reason and the suggested opening
interface Pick2 { supplier_no: number; name: string; stored?: number; why?: string; opening?: string }

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

// What the export knows about the supplier, and what it does not: no relationship, no past negotiations, no contact person.
function HistoryPanel({ h }: { h: SupplierHistory }) {
  const rows: [string, string][] = [
    [copy.trainer.supplies, h.categories ?? ''],
    [copy.trainer.spendLabel, `${formatEur(h.spend)} on ${formatInt(h.order_lines)} lines, ${formatInt(h.orders)} orders`],
    [copy.trainer.sinceLabel, `${h.first_order}, ${formatInt(h.years_active)} years, ${formatEur(h.spend_all_years)} in total`],
    [copy.trainer.deliveryLabel, h.on_time == null ? 'n/a' : formatPct(h.on_time, 0)],
    [copy.trainer.buyersLabel, h.buyers],
    [copy.trainer.statusLabel, [h.supplier_status, [h.city, h.country].filter(Boolean).join(', ')].filter(Boolean).join(', ')],
  ]
  return (
    <aside data-testid="history-panel" className="rounded-lg border border-border bg-surface p-5">
      <h2 className={label}>{copy.trainer.history}</h2>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt className={label}>{k}</dt><dd className="mt-1">{v}</dd></div>
        ))}
        {h.public_website_url && <div><dt className={label}>{copy.trainer.siteLabel}</dt><dd className="mt-1 break-all text-text-muted">{h.public_website_url}</dd></div>}
      </dl>
      <div className="mt-4 border-t border-border pt-3">
        <p className={label}>{copy.trainer.assumptions}</p>
        <p className="mt-1 text-xs text-text-muted">{copy.trainer.assumptionsText}</p>
      </div>
    </aside>
  )
}

// The supplier's representative: initials in a circle, the name and the title, so it reads as a person, not a role.
function Avatar({ initials }: { initials: string }) {
  return <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-brand-tint font-mono text-xs uppercase tracking-widest text-text">{initials}</span>
}

function ContactHead({ contact, supplier }: { contact: Contact | null; supplier: string }) {
  if (!contact) return <p className={label}>{copy.trainer.supplierRole(supplier)}</p>
  return (
    <div className="flex items-center gap-3">
      <Avatar initials={contact.initials} />
      <span>
        <span data-testid="contact-name" className="block text-sm font-medium">{contact.full_name}</span>
        <span className="block text-xs text-text-muted">{copy.trainer.contactLine(contact.role, supplier)}</span>
      </span>
    </div>
  )
}

function TurnView({ turn, supplier, facts, contact, live = false }: { turn: Turn; supplier: string; facts: BriefFact[]; contact?: Contact | null; live?: boolean }) {
  const next = facts.find((f) => f.fact_id === turn.coach.next_fact_id)
  return (
    <article data-testid="turn" data-turn={turn.turn_no} data-live={live || undefined} className="reveal space-y-3">
      <div className="rounded-lg bg-bg p-4">
        <p className={label}>{copy.trainer.you}</p>
        <p className="mt-1 max-w-prose text-base leading-relaxed">{turn.buyer}</p>
      </div>
      <div data-testid="supplier-reply" className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ContactHead contact={contact ?? null} supplier={supplier} />
          <Pill tone={turn.supplier.concession === 'none' ? 'neutral' : 'positive'}>{copy.trainer.concession[turn.supplier.concession] ?? turn.supplier.concession}</Pill>
        </div>
        <p className="mt-1 max-w-prose text-base leading-relaxed">{turn.supplier.message}</p>
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

// The practice chat: the model answers as the supplier and coaches, up to CHAT_MAX turns per session.
function Chat({ supplierNo, supplier, facts, storedId, opening }: { supplierNo: number; supplier: string; facts: BriefFact[]; storedId?: number; opening?: string }) {
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [message, setMessage] = useState(opening ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const contactQ = useQuery(() => getSupplierContact(supplierNo), [supplierNo])
  const contact = contactQ.data ?? null
  const end = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const run = useRef(0)   // a refused turn puts its text back, unless "start over" has since cleared the conversation
  // The suggested opening is long; the box grows to fit it rather than making him scroll inside a small field.
  useEffect(() => { const el = box.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }, [message])
  useEffect(() => { if (turns.length) end.current?.scrollIntoView({ block: 'nearest' }) }, [turns.length])

  const left = CHAT_MAX - turns.length
  const reset = () => { run.current++; setTurns([]); setSessionId(null); setError(null); setPending(null); setMessage(opening ?? ''); setConfirmReset(false) }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const text = message.trim()
    if (!text || busy || left <= 0) return
    const mine = ++run.current
    // the message is echoed above while the supplier answers, so it does not sit in the box as well
    setBusy(true); setError(null); setPending(text); setMessage('')
    try {
      const id = sessionId ?? (storedId ? await startLiveSession(storedId) : await startTrainerSession(supplierNo))
      if (!sessionId) setSessionId(id)
      const res = await sendTurn(id, text)
      if (res.turn) setTurns((t) => [...t, res.turn as Turn])
      else if (res.error === 'budget_exhausted') setError(copy.trainer.budget)
      else if (res.error === 'missing_api_key') setError(copy.trainer.missingKey)
      else if (res.error === 'live_turns_used') setError(copy.trainer.liveTurnsUsed)
      else if (res.error === 'rejected') setError(`${copy.trainer.rejected} ${(res.reasons ?? []).join('; ')}`)
      else setError(`${copy.trainer.failed} ${res.error ?? 'unknown'}`)
      if (!res.turn && run.current === mine) setMessage(text)   // nothing was said: he keeps what he wrote
    } catch (err) {
      setError(`${copy.trainer.failed} ${(err as Error).message}`)
      if (run.current === mine) setMessage(text)
    } finally {
      setBusy(false); setPending(null)
    }
  }

  return (
    <section data-testid="chat" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={label}>{copy.trainer.chat}</p>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-text-muted">{left > 0 ? copy.trainer.turnsLeft(left) : copy.trainer.lockedChat}</p>
          <Button variant="ghost" data-testid="start-over" disabled={busy || (turns.length === 0 && !error)} onClick={() => setConfirmReset(true)}>{copy.trainer.startOver}</Button>
        </div>
      </div>
      {confirmReset && (
        <div role="alertdialog" aria-label={copy.trainer.startOver} data-testid="start-over-confirm" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-strong bg-surface p-4">
          <p className="max-w-prose text-sm">{copy.trainer.startOverConfirm}</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>{copy.trainer.startOverCancel}</Button>
            <Button variant="primary" data-testid="start-over-yes" onClick={reset}>{copy.trainer.startOverYes}</Button>
          </div>
        </div>
      )}
      {contact && (
        <div data-testid="contact-card" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <Avatar initials={contact.initials} />
            <span>
              <span className={label}>{copy.trainer.speakingWith}</span>
              <span data-testid="contact-name" className="mt-1 block text-base font-medium">{contact.full_name}</span>
              <span className="block text-sm text-text-muted">{copy.trainer.contactLine(contact.role, supplier)}</span>
            </span>
          </div>
          <p className="max-w-prose text-xs text-text-muted">{copy.trainer.contactInvented}</p>
        </div>
      )}
      <p className="text-xs text-text-muted">{copy.trainer.chatNote(CHAT_MAX)}</p>
      {turns.length === 0 && !pending && <p data-testid="chat-empty" className="text-sm text-text-muted">{opening ? copy.trainer.suggested : copy.trainer.chatEmpty}</p>}
      {turns.map((t) => <TurnView key={t.id} turn={t} supplier={supplier} facts={facts} contact={contact} live />)}
      {pending && (
        <div className="space-y-3">
          <div className="rounded-lg bg-bg p-4"><p className={label}>{copy.trainer.you}</p><p className="mt-1 max-w-prose text-base leading-relaxed">{pending}</p></div>
          <div role="status" data-testid="typing" className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
            <span aria-hidden="true" className="flex gap-1">
              {[0, 1, 2].map((i) => <span key={i} className="typing-dot h-2 w-2 rounded-full bg-brand" />)}
            </span>
            <span className="text-sm text-text-muted">{copy.trainer.typing(contact ? `${contact.honorific} ${contact.last_name}` : supplier)}</span>
          </div>
        </div>
      )}
      <div ref={end} />
      <form data-testid="chat-form" onSubmit={submit} className="space-y-2">
        <label htmlFor="chat-message" className={label}>{copy.trainer.liveLabel}</label>
        <textarea id="chat-message" ref={box} value={message} onChange={(e) => setMessage(e.target.value)} disabled={busy || left <= 0} rows={5} maxLength={2000} placeholder={copy.trainer.livePlaceholder}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
          className="block w-full resize-none overflow-y-auto rounded-md border border-border-strong bg-surface px-4 py-3 text-lg leading-relaxed text-text transition-colors duration-fast placeholder:text-text-muted hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50" />
        {error && <p role="alert" data-testid="live-error" className="text-sm text-danger-500">{error}</p>}
        <div className="flex justify-end"><Button type="submit" variant="primary" loading={busy} disabled={!message.trim() || left <= 0}>{copy.trainer.send}</Button></div>
      </form>
    </section>
  )
}

// Case selection: the three recommended negotiations, plus the stored example session.
function SupplierSearch({ onPick }: { onPick: (c: Pick2) => void }) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SupplierHit[] | null>(null)
  const [busy, setBusy] = useState(false)
  const find = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try { setHits(await searchSuppliers(query.trim())) } finally { setBusy(false) }
  }
  return (
    <section data-testid="supplier-search">
      <h2 className={label}>{copy.trainer.searchTitle}</h2>
      <form onSubmit={find} className="mt-2 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="supplier-query" className={label}>{copy.trainer.searchLabel}</label>
          <input id="supplier-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.trainer.searchPlaceholder}
            className="mt-1 block w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text transition-colors duration-fast placeholder:text-text-muted hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg" />
        </div>
        <Button type="submit" loading={busy}>{copy.trainer.searchTitle}</Button>
      </form>
      {hits && hits.length === 0 && <p className="mt-3 text-sm text-text-muted">{copy.trainer.searchEmpty}</p>}
      {hits && hits.length > 0 && (
        <ul data-testid="search-hits" className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
          {hits.map((h) => (
            <li key={h.supplier_no}>
              <button type="button" data-testid="search-hit" onClick={() => onPick({ supplier_no: h.supplier_no, name: h.supplier_name })}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none flex w-full flex-wrap items-baseline justify-between gap-3 px-4 py-3 text-left text-sm transition-colors duration-fast hover:bg-surface-hover active:scale-95">
                <span className="font-medium">{h.supplier_name}</span>
                <span className="text-text-muted">{copy.trainer.searchHit(formatEur(h.spend), h.years_active)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Cases({ candidates, storedName, onPick }: { candidates: Candidate[]; storedName: string | null; onPick: (c: Pick2) => void }) {
  return (
    <div className="mt-6 space-y-6">
      <section>
        <h2 className={label}>{copy.trainer.chooseTitle}</h2>
        <p className="mt-1 max-w-prose text-sm text-text-muted">{copy.trainer.chooseNote}</p>
        {candidates.length === 0 ? <div className="mt-3"><EmptyState text={copy.trainer.empty} /></div> : (
          <ul className="mt-4 grid gap-4 lg:grid-cols-3">
            {candidates.map((c) => (
              <li key={c.supplier_no}>
                <button type="button" data-testid="candidate" data-supplier={c.supplier_no} onClick={() => onPick({ supplier_no: c.supplier_no, name: c.supplier_name, why: c.why, opening: c.opening })}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none flex h-full w-full flex-col rounded-lg border border-border bg-surface p-5 text-left transition-colors duration-fast hover:border-border-strong active:scale-95">
                  <Pill tone="brand">{copy.index?.samplePill ?? 'Sample index data'}</Pill>
                  <h3 className="mt-3 text-lg font-semibold">{c.supplier_name}</h3>
                  <p data-tabular className="mt-2 text-3xl font-semibold tracking-tight text-brand">{formatEur(c.gap)}</p>
                  <p className="mt-1 text-sm text-text-muted">{copy.trainer.gapLabel}</p>
                  <p className="mt-3 text-sm">{copy.trainer.aboveBasket(formatPct(c.deviation, 1))}</p>
                  <p className="mt-1 text-sm text-text-muted">{copy.trainer.openSpend(formatEur(c.free_spend), c.free_articles)}</p>
                  <p className="mt-auto pt-4 text-sm font-medium">{copy.trainer.startWith(c.supplier_name)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SupplierSearch onPick={onPick} />
      {storedName && (
        <section>
          <h2 className={label}>{copy.trainer.exampleTitle}</h2>
          <p className="mt-1 max-w-prose text-sm text-text-muted">{copy.trainer.exampleNote(storedName)}</p>
          <div className="mt-3"><Button data-testid="pick-example" onClick={() => onPick({ supplier_no: 0, name: storedName, stored: 1 })}>{copy.trainer.startWith(storedName)}</Button></div>
        </section>
      )}
    </div>
  )
}

export function Trainer() {
  const [pick, setPick] = useState<Pick2 | null>(null)
  const [shown, setShown] = useState(0)   // the presenter steps through the stored session turn by turn
  const list = useQuery(async () => {
    const [candidates, stored] = await Promise.all([getCandidates(3), getStoredSession()])
    return { candidates, stored }
  }, [])
  const chosen = pick ? (pick.stored ? list.data?.stored?.id ?? null : null) : null
  const detail = useQuery(async () => {
    if (!pick) return null
    const supplierNo = pick.stored ? (list.data?.stored ? 3000742 : 0) : pick.supplier_no
    const [facts, history, turns, opening] = await Promise.all([
      getBrief(supplierNo), getSupplierHistory(supplierNo), chosen ? getTurns(chosen) : Promise.resolve([] as Turn[]),
      pick.opening ? Promise.resolve(pick.opening) : pick.stored ? Promise.resolve('') : getOpening(supplierNo),
    ])
    return { facts, history, turns, supplierNo, opening }
  }, [pick?.supplier_no, pick?.stored, chosen])

  if (list.error) return <ErrorState text={copy.cockpit.error} detail={list.error} />
  if (!list.data) return <Skeleton lines={8} />

  const header = (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">{copy.trainer.title}</h1>
      <span data-testid="preview-pill"><Pill tone="brand">{copy.trainer.preview}</Pill></span>
    </div>
  )

  if (!pick) {
    return (
      <section>
        {header}
        <p className="mt-2 max-w-prose text-text-muted">{copy.trainer.subtitle(list.data.candidates[0]?.supplier_name ?? 'a supplier')}</p>
        <RoadmapStrip />
        <Cases candidates={list.data.candidates} storedName={list.data.stored?.supplier_name ?? null} onPick={(p) => { setPick(p); setShown(0) }} />
      </section>
    )
  }

  const d = detail.data
  const turns = d?.turns ?? []
  const visible = turns.slice(0, shown)
  const done = shown >= turns.length
  return (
    <section>
      {header}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <p className="text-text-muted">{pick.name}</p>
        <Button data-testid="back-to-cases" variant="ghost" onClick={() => setPick(null)}>{copy.trainer.back}</Button>
      </div>
      {detail.error && <div className="mt-4"><ErrorState text={copy.cockpit.error} detail={detail.error} /></div>}
      {!d ? <div className="mt-6"><Skeleton lines={6} /></div> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            {pick.why && (
              <section data-testid="why-panel" className="rounded-lg border border-border bg-brand-tint/40 p-5">
                <h2 className={label}>{copy.trainer.whyTitle}</h2>
                <p className="mt-2 max-w-prose text-sm">{pick.why}</p>
              </section>
            )}
            <BriefPanel facts={d.facts} />
            {d.history && <HistoryPanel h={d.history} />}
          </div>
          <div className="space-y-6 lg:col-span-2">
            {turns.length > 0 && (
              <section data-testid="conversation" aria-label={copy.trainer.session} className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className={label}>{copy.trainer.session}{shown > 0 && <span className="ml-2">{copy.trainer.turnOf(Math.min(shown, turns.length), turns.length)}</span>}</p>
                  {!done && (
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setShown(turns.length)}>{copy.trainer.showAll}</Button>
                      <Button variant="primary" data-testid="next-turn" onClick={() => setShown((n) => n + 1)}>{copy.trainer.nextTurn}</Button>
                    </div>
                  )}
                </div>
                {shown === 0 && <p data-testid="replay-hint" className="text-sm text-text-muted">{copy.trainer.replayHint(turns.length)}</p>}
                {visible.map((t) => <TurnView key={t.id} turn={t} supplier={pick.name} facts={d.facts} />)}
              </section>
            )}
            {(turns.length === 0 || done) && <Chat key={`${d.supplierNo}-${turns.length}`} supplierNo={d.supplierNo} supplier={pick.name} facts={d.facts} storedId={pick.stored ? list.data.stored?.id : undefined} opening={d.opening || undefined} />}
          </div>
        </div>
      )}
    </section>
  )
}

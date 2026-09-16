import { copy } from '../copy'
import { formatEur, formatInt, formatPct, formatPrice } from '../lib/format'
import { formatMillions, getBenchmarkItems, getBenchmarkSummary, type BenchmarkItem } from '../lib/priceBenchmark'
import { useQuery } from '../lib/useQuery'
import { Fold } from './Fold'
import { Pill } from './Pill'
import { EmptyState, ErrorState, Skeleton } from './States'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const b = copy.benchmark

// "low – actual spec unknown; ..." reads as level plus reason; a bare level has no reason
const split = (s: string) => { const [level, ...rest] = s.split(' – '); return { level, reason: rest.join(' – ') || null } }
const stamp = (s: string) => new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

function DevBanner() {
  return (
    <div role="note" data-testid="benchmark-dev-banner" className="rounded-lg border border-brand bg-brand-tint p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="brand">{b.inDevelopment}</Pill>
        <p className="text-sm font-medium">{b.devTitle}</p>
      </div>
      <div className="mt-2"><Fold summary={b.devMore}><p className="max-w-prose text-text-muted">{b.devText}</p></Fold></div>
    </div>
  )
}

function Disclaimer() {
  return (
    <div role="note" data-testid="benchmark-disclaimer" className="rounded-lg border border-border border-l-4 border-l-warning-500 bg-surface p-4">
      <p className="text-sm font-semibold">{b.disclaimerLead}</p>
      <div className="mt-2"><Fold summary={b.disclaimerMore}><p className="max-w-prose text-text-muted">{b.disclaimer}</p></Fold></div>
    </div>
  )
}

// Folded by default: four steps, each with what the scan does today and what it takes at scale.
function Method() {
  return (
    <section data-testid="benchmark-method" className="rounded-lg border border-border bg-surface p-4">
      <Fold summary={b.methodTitle}>
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {b.steps.map((s, i) => (
            <li key={s.title} data-testid="benchmark-step" className="rounded-lg border border-border p-4">
              <p className="font-mono text-xs text-text-muted">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-1 font-semibold text-text">{s.title}</h3>
              <p className={`${label} mt-3`}>{b.today}</p>
              <p className="mt-1 text-text">{s.today}</p>
              <p className={`${label} mt-3`}>{b.atScale}</p>
              <p className="mt-1 text-text-muted">{s.scale}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 max-w-prose text-text-muted">{b.scaleNote}</p>
      </Fold>
    </section>
  )
}

function SubBadge({ name, value }: { name: string; value: string }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 rounded-md border border-border px-2 py-1 text-xs">
      <span className="font-mono uppercase tracking-widest text-text-muted">{name}</span><span className="font-medium">{value}</span>
    </span>
  )
}

// One scan result: what the agent recommends, what it is worth, what to do next. Evidence and the full path fold open.
function ResultCard({ item: i }: { item: BenchmarkItem }) {
  const confirmed = i.case_type === 'price_confirmed'
  const comp = split(i.price_comparability)
  const tHigh = i.target_price_high_case_eur
  const paid = formatPrice(i.avg_price)
  const reco = confirmed
    ? b.reco.price_confirmed(formatPct(i.below_benchmark_pct ?? 0))
    : b.reco[i.case_type]?.(i.description, formatPrice(tHigh), paid) ?? ''
  return (
    <article data-testid="benchmark-card" data-article={i.article_no} data-case={i.case_type} className="rounded-lg border border-border bg-surface p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={label}>{b.article(i.article_no, i.category)}</p>
          <h3 className="mt-1 text-xl font-semibold">{i.description}</h3>
        </div>
        <span data-testid="benchmark-case"><Pill tone={confirmed ? 'positive' : 'brand'}>{b.caseType[i.case_type] ?? i.case_type}</Pill></span>
      </header>

      <p className={`${label} mt-5`}>{b.recommendation}</p>
      <p data-testid="benchmark-reco" className="mt-1 max-w-prose text-base">{reco}</p>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className={label}>{b.savingsLabel}</p>
          {confirmed
            ? <p data-testid="benchmark-savings" className="mt-1 text-lg font-medium text-text-muted">{b.noSavingsLine}</p>
            : <>
                <p data-testid="benchmark-savings" data-tabular className="mt-1 text-3xl font-semibold tracking-tight">{formatEur(i.savings_low)} – {formatEur(i.savings_high)}</p>
                <p className="mt-1 text-xs text-text-muted">{b.savingsCases(formatPrice(i.target_price_low_case_eur), formatPrice(tHigh))}</p>
              </>}
        </div>
        <p data-testid="benchmark-gap" data-tabular className="text-sm text-text-muted">
          {confirmed ? b.priceLineConfirmed(paid, `~${formatEur(i.bench_ref)}`) : b.priceLine(paid, formatPrice(tHigh), formatPct(i.gap_pct ?? 0))}
        </p>
      </div>

      <div className="mt-5 rounded-md border border-border bg-bg p-4">
        <p className={label}>{b.nextStep}</p>
        <p data-testid="benchmark-next" className="mt-1 text-sm">{i.actions[0]}</p>
      </div>

      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <Fold summary={b.pathForward(i.actions.length)} testId="benchmark-path">
          <ol data-testid="benchmark-actions" className="space-y-2">
            {i.actions.map((a, n) => (
              <li key={a} className="flex gap-3"><span aria-hidden="true" className="font-mono text-xs text-text-muted">{String(n + 1).padStart(2, '0')}</span><span>{a}</span></li>
            ))}
          </ol>
        </Fold>
        <Fold summary={b.evidence} testId="benchmark-evidence">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className={label}>{b.identifiedAs}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 font-medium"><span data-testid="benchmark-part">{i.identified_part}</span><Pill tone="neutral">{b.guess}</Pill></p>
              <p className="mt-1 text-xs text-text-muted">{b.idType[i.identification_type] ?? i.identification_type}</p>
              <p className="mt-2 max-w-prose text-text-muted">{i.evidence}</p>
              {i.alternatives.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-text-muted">{i.alternatives.map((a) => <li key={a}>{a}</li>)}</ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <SubBadge name={b.identification} value={i.identification_confidence} />
                <SubBadge name={b.comparability} value={comp.level} />
              </div>
              {comp.reason && <p className="mt-2 text-xs text-text-muted">{comp.reason}</p>}
            </div>
            <div>
              <p className={label}>{b.compare}</p>
              <p className="mt-1 text-xs text-text-muted">{b.webPrice} (€): {i.benchmark.price_eur} · {i.benchmark.price_type}</p>
              <p className="mt-1 text-xs text-text-muted">
                {b.source}: <a data-testid="benchmark-source" href={i.benchmark.source_url} target="_blank" rel="noopener noreferrer"
                  className="rounded-sm text-text underline decoration-border-strong underline-offset-2 transition-colors duration-fast hover:decoration-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:text-text-muted">{i.benchmark.source_name}</a>, {b.retrieved(i.researched_on)}
              </p>
              <p className={`${label} mt-4`}>{b.suppliers}</p>
              <table className="mt-1 w-full text-sm">
                <tbody>
                  {i.suppliers.map((s) => (
                    <tr key={s.supplier_no} data-testid="benchmark-supplier" className="border-t border-border first:border-t-0">
                      <td className="py-1.5 pr-3">{s.name}{s.country && <span className="ml-1 text-text-muted">({s.country})</span>}</td>
                      <td data-tabular className="py-1.5 pr-3 text-right text-text-muted">{formatInt(s.qty)}</td>
                      <td data-tabular className="py-1.5 text-right">{formatPrice(s.avg_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Fold>
      </div>
    </article>
  )
}

// The flagship's page: what the scan is worth, what it found, and how it works (folded).
export function PriceBenchmarkPanel({ runId, finishedAt }: { runId: number | null; finishedAt?: string | null }) {
  const q = useQuery(async () => (runId ? { items: await getBenchmarkItems(runId), summary: await getBenchmarkSummary(runId) } : null), [runId])
  const s = q.data?.summary
  return (
    <div className="space-y-6">
      <DevBanner />
      {s && (
        <section data-testid="benchmark-headline" className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap gap-2"><Pill tone="brand">{b.inDevelopment}</Pill><Pill tone="neutral">{b.moonshot}</Pill><span data-testid="benchmark-confidence"><Pill tone="neutral">{b.lowConfidence}</Pill></span></div>
          <p data-testid="benchmark-range" className="mt-4">
            <span className="block text-sm text-text-muted">{b.headlineLabel}</span>{' '}
            <span data-tabular className="block text-4xl font-semibold tracking-tight">{b.headlineRange(formatMillions(s.savings_low), formatMillions(s.savings_high))}</span>{' '}
            <span className="block text-sm text-text-muted">{b.headlineSample(s.items)}</span>
          </p>
          <p data-testid="benchmark-subline" className="mt-3 text-sm text-text-muted">{b.subline(s.items, formatInt(s.article_universe), s.researched_on)}</p>
        </section>
      )}
      <Disclaimer />
      <Method />
      {q.error && <ErrorState text={copy.cockpit.error} detail={q.error} />}
      {!runId && <EmptyState text={b.notRun} />}
      {runId && q.loading && !q.data && <Skeleton lines={8} />}
      {q.data && q.data.items.length > 0 && s && (
        <section aria-labelledby="benchmark-findings-title">
          <h2 id="benchmark-findings-title" className="text-lg font-semibold">{b.scanTitle}</h2>
          <p data-testid="benchmark-scan-sub" className="mt-1 text-sm text-text-muted">{b.scanSub(s.items, formatInt(s.article_universe), finishedAt ? stamp(finishedAt) : '')}</p>
          <p className="mt-1 max-w-prose text-sm text-text-muted">{b.scanNote}</p>
          <div className="mt-4 space-y-4">{q.data.items.map((item) => <ResultCard key={item.id} item={item} />)}</div>
        </section>
      )}
    </div>
  )
}

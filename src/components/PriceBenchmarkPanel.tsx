import type { ReactNode } from 'react'
import { copy } from '../copy'
import { formatEur, formatInt, formatPct, formatPrice } from '../lib/format'
import { formatMillions, getBenchmarkItems, getBenchmarkSummary, type BenchmarkItem } from '../lib/priceBenchmark'
import { useQuery } from '../lib/useQuery'
import { Pill } from './Pill'
import { EmptyState, ErrorState, Skeleton } from './States'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const b = copy.benchmark

// "low – actual spec unknown; ..." reads as level plus reason; a bare level has no reason
const split = (s: string) => { const [level, ...rest] = s.split(' – '); return { level, reason: rest.join(' – ') || null } }

function DevBanner() {
  return (
    <div role="note" data-testid="benchmark-dev-banner" className="rounded-lg border border-brand bg-brand-tint p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="brand">{b.inDevelopment}</Pill>
        <p className="text-sm font-medium">{b.devTitle}</p>
      </div>
      <p className="mt-2 max-w-prose text-sm text-text-muted">{b.devText}</p>
    </div>
  )
}

function Disclaimer() {
  return (
    <div role="note" data-testid="benchmark-disclaimer" className="rounded-lg border border-border border-l-4 border-l-warning-500 bg-surface p-4">
      <p className="text-sm"><strong className="font-semibold">{b.disclaimerLead}</strong> <span className="text-text-muted">{b.disclaimer}</span></p>
    </div>
  )
}

// Four steps, each with what the sample does today and what it takes at scale.
function Method() {
  return (
    <section data-testid="benchmark-method" aria-labelledby="benchmark-method-title">
      <h2 id="benchmark-method-title" className="text-lg font-semibold">{b.methodTitle}</h2>
      <ol className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {b.steps.map((s, i) => (
          <li key={s.title} data-testid="benchmark-step" className="rounded-lg border border-border bg-surface p-4">
            <p className="font-mono text-xs text-text-muted">{String(i + 1).padStart(2, '0')}</p>
            <h3 className="mt-1 font-semibold">{s.title}</h3>
            <p className={`${label} mt-3`}>{b.today}</p>
            <p className="mt-1 text-sm">{s.today}</p>
            <p className={`${label} mt-3`}>{b.atScale}</p>
            <p className="mt-1 text-sm text-text-muted">{s.scale}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 max-w-prose text-sm text-text-muted">{b.scaleNote}</p>
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

function Bar({ name, value, pct, tone }: { name: string; value: string; pct: number; tone: 'brand' | 'neutral' }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm"><span className="text-text-muted">{name}</span><span data-tabular className="font-medium">{value}</span></div>
      <div className="mt-1 h-2 rounded-full bg-border" aria-hidden="true">
        <div className={`h-2 rounded-full ${tone === 'brand' ? 'bg-brand' : 'bg-series-neutral'}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
      </div>
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <div><p className={label}>{title}</p><div className="mt-2">{children}</div></div>
}

function FindingCard({ item: i }: { item: BenchmarkItem }) {
  const confirmed = i.case_type === 'price_confirmed'
  const comp = split(i.price_comparability)
  const tHigh = i.target_price_high_case_eur
  const max = Math.max(i.avg_price, confirmed ? i.bench_ref ?? 0 : 0)
  return (
    <article data-testid="benchmark-card" data-article={i.article_no} data-case={i.case_type} className="rounded-lg border border-border bg-surface p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={label}>{b.article(i.article_no, i.category)}</p>
          <h3 className="mt-1 text-xl font-semibold">{i.description}</h3>
        </div>
        <span data-testid="benchmark-case"><Pill tone={confirmed ? 'positive' : 'brand'}>{b.caseType[i.case_type] ?? i.case_type}</Pill></span>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <Block title={b.identifiedAs}>
          <p className="flex flex-wrap items-center gap-2 font-medium"><span data-testid="benchmark-part">{i.identified_part}</span><Pill tone="neutral">{b.guess}</Pill></p>
          <p className="mt-1 text-xs text-text-muted">{b.idType[i.identification_type] ?? i.identification_type}</p>
          <p className="mt-2 max-w-prose text-sm text-text-muted">{i.evidence}</p>
          {i.alternatives.length > 0 && (
            <details className="group mt-3 text-sm">
              <summary className="w-fit cursor-pointer rounded-sm font-medium transition-colors duration-fast hover:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:text-text-muted">{b.alternatives(i.alternatives.length)}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-text-muted">{i.alternatives.map((a) => <li key={a}>{a}</li>)}</ul>
            </details>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <SubBadge name={b.identification} value={i.identification_confidence} />
            <SubBadge name={b.comparability} value={comp.level} />
          </div>
          {comp.reason && <p className="mt-2 text-xs text-text-muted">{comp.reason}</p>}
        </Block>

        <div className="space-y-6">
          <Block title={b.compare}>
            <div data-testid="benchmark-compare" className="space-y-3">
              {confirmed
                ? <><Bar name={b.list} value={`~${formatEur(i.bench_ref)}`} pct={100} tone="neutral" /><Bar name={b.mechaform} value={formatPrice(i.avg_price)} pct={(i.avg_price / max) * 100} tone="brand" /></>
                : <><Bar name={b.mechaform} value={formatPrice(i.avg_price)} pct={100} tone="brand" />{tHigh != null && <Bar name={b.target} value={formatPrice(tHigh)} pct={(tHigh / i.avg_price) * 100} tone="neutral" />}</>}
            </div>
            <p data-testid="benchmark-gap" className="mt-3 text-sm font-medium">
              {confirmed ? b.below(formatPct(i.below_benchmark_pct ?? 0)) : i.gap_pct != null ? b.gap(formatPct(i.gap_pct)) : null}
            </p>
            <p className="mt-2 text-xs text-text-muted">{b.webPrice} (€): {i.benchmark.price_eur} · {i.benchmark.price_type}</p>
            <p className="mt-1 text-xs text-text-muted">
              {b.source}: <a data-testid="benchmark-source" href={i.benchmark.source_url} target="_blank" rel="noopener noreferrer"
                className="rounded-sm text-text underline decoration-border-strong underline-offset-2 transition-colors duration-fast hover:decoration-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:text-text-muted">{i.benchmark.source_name}</a>, {b.retrieved(i.researched_on)}
            </p>
          </Block>

          <Block title={b.savingsLabel}>
            {confirmed ? (
              <><p data-testid="benchmark-savings" className="text-2xl font-semibold tracking-tight">{b.noSavings}</p><p className="mt-1 text-sm text-text-muted">{b.confirmedNote}</p></>
            ) : (
              <>
                <p data-testid="benchmark-savings" data-tabular className="text-2xl font-semibold tracking-tight">{formatEur(i.savings_low)} – {formatEur(i.savings_high)}</p>
                <p className="mt-1 text-xs text-text-muted">{b.savingsCases(formatPrice(i.target_price_low_case_eur), formatPrice(tHigh))}</p>
              </>
            )}
          </Block>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Block title={b.suppliers}>
          <table className="w-full text-sm">
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
        </Block>
        <Block title={b.actions}>
          <ol data-testid="benchmark-actions" className="space-y-2 text-sm">
            {i.actions.map((a) => (
              <li key={a} className="flex gap-3"><span aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-border-strong" /><span>{a}</span></li>
            ))}
          </ol>
        </Block>
      </div>
    </article>
  )
}

// The flagship's page: development status, the sample's range, the always-visible disclaimer, the method, one card per article.
export function PriceBenchmarkPanel({ runId }: { runId: number | null }) {
  const q = useQuery(async () => (runId ? { items: await getBenchmarkItems(runId), summary: await getBenchmarkSummary(runId) } : null), [runId])
  const s = q.data?.summary
  return (
    <div className="space-y-6">
      <DevBanner />
      {s && (
        <section data-testid="benchmark-headline" className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap gap-2"><Pill tone="brand">{b.flagship}</Pill><Pill tone="neutral">{b.moonshot}</Pill><span data-testid="benchmark-confidence"><Pill tone="neutral">{b.lowConfidence}</Pill></span></div>
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
      {q.data && q.data.items.length > 0 && (
        <section aria-labelledby="benchmark-findings-title">
          <h2 id="benchmark-findings-title" className="text-lg font-semibold">{b.findingsTitle}</h2>
          <div className="mt-3 space-y-4">{q.data.items.map((item) => <FindingCard key={item.id} item={item} />)}</div>
        </section>
      )}
    </div>
  )
}

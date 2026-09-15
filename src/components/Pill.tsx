type Tone = 'neutral' | 'positive' | 'brand'
const dot: Record<Tone, string> = { neutral: 'bg-series-neutral', positive: 'bg-positive', brand: 'bg-brand' }

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-xs uppercase tracking-widest text-text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${dot[tone]}`} aria-hidden="true" />
      {children}
    </span>
  )
}

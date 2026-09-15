import { copy } from '../copy'

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label={copy.cockpit.loading} className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => <div key={i} className="h-4 animate-pulse rounded-sm bg-border" style={{ width: `${70 - i * 12}%` }} />)}
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return <div data-testid="empty-state" className="rounded-lg border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-text-muted">{text}</div>
}

export function ErrorState({ text, detail }: { text: string; detail?: string }) {
  return (
    <div role="alert" data-testid="error-state" className="rounded-lg border border-danger-500/40 bg-surface p-6 text-sm">
      <p className="font-medium text-text">{text}</p>
      {detail && <p className="mt-1 font-mono text-xs text-text-muted">{detail}</p>}
    </div>
  )
}

import type { EventRow } from '../lib/data'
import { copy } from '../copy'

const stamp = (s: string) => new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }).toUpperCase()

export function ActivityFeed({ events }: { events: EventRow[] }) {
  if (events.length === 0) return <p data-testid="activity-feed" className="text-sm text-text-muted">{copy.feed.none}</p>
  return (
    <ol data-testid="activity-feed" className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
      {events.map((e) => (
        <li key={e.id} data-event={e.event_type} data-time={e.created_at} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2">
          <time className="font-mono text-xs uppercase tracking-widest text-text-muted" dateTime={e.created_at}>{stamp(e.created_at)}</time>
          <span>{e.message}</span>
        </li>
      ))}
    </ol>
  )
}

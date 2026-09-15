import { copy } from '../copy'
import { Pill } from './Pill'

const tone: Record<string, 'neutral' | 'positive' | 'brand'> = { open: 'neutral', draft_ready: 'brand', sent_simulated: 'positive', realised: 'positive', dismissed: 'neutral' }

export function StatusPill({ status }: { status: string }) {
  return <span data-testid="status-pill" data-status={status}><Pill tone={tone[status] ?? 'neutral'}>{copy.status[status] ?? status}</Pill></span>
}

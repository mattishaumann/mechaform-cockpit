import { useState } from 'react'
import type { RegisterRow } from '../lib/data'
import { setFindingStatus } from '../lib/data'
import { copy } from '../copy'
import { Button } from './Button'
import { StatusPill } from './StatusPill'

// Status controls for one finding. "Send" only changes the status and logs an event; nothing leaves the system.
export function FindingActions({ row, onChanged }: { row: RegisterRow; onChanged: (status: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const set = async (status: string) => {
    setBusy(status); setError(null)
    try { await setFindingStatus(row.id, status); onChanged(status) } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }
  return (
    <div data-testid="finding-actions" className="flex flex-wrap items-center gap-2">
      <StatusPill status={row.status} />
      {row.action_type && <span className="font-mono text-xs uppercase tracking-widest text-text-muted">{row.action_type}</span>}
      {row.status !== 'sent_simulated' && row.status !== 'realised' && <Button loading={busy === 'sent_simulated'} disabled={Boolean(busy)} onClick={() => set('sent_simulated')}>{copy.finding.markSent}</Button>}
      {row.status === 'open' && <Button variant="ghost" loading={busy === 'dismissed'} disabled={Boolean(busy)} onClick={() => set('dismissed')}>{copy.finding.dismiss}</Button>}
      {row.status !== 'open' && <Button variant="ghost" loading={busy === 'open'} disabled={Boolean(busy)} onClick={() => set('open')}>{copy.finding.reopen}</Button>}
      {error && <span role="alert" className="text-xs text-danger-500">{error}</span>}
    </div>
  )
}

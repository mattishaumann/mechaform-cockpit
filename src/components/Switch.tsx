// On/off switch. The accent marks the active state; the label beside it says the state in words.
// States: hover (track darkens), focus-visible (ring), active (press), disabled, busy (while the change is saved).
export function Switch({ on, label, onLabel, offLabel, busy = false, disabled = false, onChange, testId }: {
  on: boolean; label: string; onLabel: string; offLabel: string; busy?: boolean; disabled?: boolean; onChange: (next: boolean) => void; testId?: string
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <button type="button" role="switch" aria-checked={on} aria-label={label} aria-busy={busy || undefined} disabled={disabled || busy} data-testid={testId}
        onClick={() => onChange(!on)}
        className={`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-fast active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'bg-accent hover:bg-accent-hover' : 'bg-border-strong hover:bg-text-muted'} ${busy ? 'animate-pulse' : ''}`}>
        <span aria-hidden="true" className={`inline-block h-5 w-5 rounded-full bg-surface shadow-sm transition-transform duration-fast ease-out ${on ? 'translate-x-4' : 'translate-x-1'}`} />
      </button>
      <span className="font-mono text-xs uppercase tracking-widest text-text-muted">{on ? onLabel : offLabel}</span>
    </label>
  )
}

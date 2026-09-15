import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
const base = 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-[background-color,transform,opacity] duration-fast ease-out active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-bg hover:bg-ink-hover',
  secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-hover',
  ghost: 'text-text-muted hover:bg-surface-hover hover:text-text',
}

export function Button({ variant = 'secondary', loading = false, className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button type="button" {...props} disabled={props.disabled || loading} aria-busy={loading || undefined} className={`${base} ${variants[variant]} ${className}`}>
      {loading ? <span className="h-3 w-12 animate-pulse rounded-sm bg-border-strong/40" aria-hidden="true" /> : children}
    </button>
  )
}

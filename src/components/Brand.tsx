import { copy } from '../copy'

// The Tacto mark: a thin four-point spark in brand orange and the lowercase wordmark.
export function Brand() {
  return (
    <a href="/" data-testid="brand" className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none inline-flex items-center gap-2 rounded-md text-text no-underline" aria-label="Tacto, home">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="text-brand" fill="currentColor">
        <path d="M12 0c.4 6.9 4.7 11.4 12 12-7.3.6-11.6 5.1-12 12-.4-6.9-4.7-11.4-12-12 7.3-.6 11.6-5.1 12-12Z" />
      </svg>
      <span className="text-xl font-medium tracking-tight">{copy.brand}</span>
    </a>
  )
}

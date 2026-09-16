import type { ReactNode } from 'react'

// Explanation that stays out of the way: one line, opened on demand.
export function Fold({ summary, children, testId }: { summary: string; children: ReactNode; testId?: string }) {
  return (
    <details data-testid={testId} className="text-sm">
      <summary className="w-fit cursor-pointer rounded-sm font-medium text-text-muted transition-colors duration-fast hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:text-text">{summary}</summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}

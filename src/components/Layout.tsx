import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Brand } from './Brand'
import { copy } from '../copy'
import { AGENTS, enabledAgents } from '../lib/agents'

const link = 'block rounded-md px-3 py-2 text-sm text-text-muted no-underline transition-colors duration-fast hover:bg-surface-hover hover:text-text aria-[current=page]:bg-surface aria-[current=page]:text-text aria-[current=page]:font-medium'

export function Layout({ children, agentNames }: { children: ReactNode; agentNames: Record<string, string> }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <Brand />
        <div className="text-sm text-text-muted">
          <span className="font-mono text-xs uppercase tracking-widest">{copy.productName}</span>
          <span className="mx-2">/</span>
          <span>{copy.customer}</span>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        <nav aria-label="Main" className="w-52 shrink-0">
          <NavLink to="/" end className={link}>{copy.cockpit.title}</NavLink>
          <p className="mt-4 px-3 font-mono text-xs uppercase tracking-widest text-text-muted">Agents</p>
          {enabledAgents.map((k) => (
            <NavLink key={k} to={`/agents/${k}`} className={link}>{agentNames[k] ?? AGENTS[k].key}</NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

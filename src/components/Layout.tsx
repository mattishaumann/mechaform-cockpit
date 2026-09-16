import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Brand } from './Brand'
import { PeriodSelector } from './PeriodSelector'
import { copy } from '../copy'
import { AGENTS, enabledAgents, flagshipAgent, previewAgents, previewPages } from '../lib/agents'

const link = 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none block whitespace-nowrap rounded-md px-3 py-2 text-sm text-text-muted no-underline transition-colors duration-fast hover:bg-surface-hover hover:text-text aria-[current=page]:bg-surface aria-[current=page]:text-text aria-[current=page]:font-medium md:whitespace-normal'

export function Layout({ children, agentNames }: { children: ReactNode; agentNames: Record<string, string> }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 md:px-6">
        <Brand />
        <div className="flex items-center gap-6">
          <PeriodSelector />
          <div className="hidden text-sm text-text-muted lg:block">
            <span className="font-mono text-xs uppercase tracking-widest">{copy.productName}</span>
            <span className="mx-2">/</span>
            <span>{copy.customer}</span>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:px-6 md:py-8">
        <nav aria-label="Main" className="-mx-4 flex shrink-0 gap-1 overflow-x-auto px-4 md:mx-0 md:w-52 md:flex-col md:overflow-visible md:px-0">
          <NavLink to={{ pathname: '/', search: window.location.search }} end className={link}>{copy.cockpit.title}</NavLink>
          <NavLink to={{ pathname: '/register', search: window.location.search }} className={link}>{copy.register.title}</NavLink>
          <p className="hidden px-3 pt-4 font-mono text-xs uppercase tracking-widest text-text-muted md:block">Agents</p>
          {flagshipAgent && (
            <NavLink data-testid="nav-flagship" to={{ pathname: `/agents/${flagshipAgent}`, search: window.location.search }} className={link}>
              {agentNames[flagshipAgent] ?? AGENTS[flagshipAgent].key}<span className="ml-2 font-mono text-xs uppercase tracking-widest text-brand">{copy.benchmark.navMark}</span>
            </NavLink>
          )}
          {enabledAgents.map((k) => (
            <NavLink key={k} to={{ pathname: `/agents/${k}`, search: window.location.search }} className={link}>{agentNames[k] ?? AGENTS[k].key}</NavLink>
          ))}
          {(previewAgents.length > 0 || previewPages.length > 0) && <p className="hidden px-3 pt-4 font-mono text-xs uppercase tracking-widest text-text-muted md:block">{copy.index.previewNav}</p>}
          {previewAgents.map((k) => (
            <NavLink key={k} data-testid={`nav-preview-${k}`} to={{ pathname: `/agents/${k}`, search: window.location.search }} className={link}>{agentNames[k] ?? AGENTS[k].key}</NavLink>
          ))}
          {previewPages.map((p) => (
            <NavLink key={p.key} data-testid={`nav-${p.key}`} to={{ pathname: p.path, search: window.location.search }} className={link}>{copy.index.previewPageName[p.key] ?? p.key}</NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

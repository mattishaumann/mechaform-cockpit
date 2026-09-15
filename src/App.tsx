import { useCallback, useMemo } from 'react'
import { BrowserRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Agent } from './pages/Agent'
import { Cockpit } from './pages/Cockpit'
import { getCases } from './lib/data'
import { DEFAULT_PERIOD, isValidDate, PeriodContext, type Period } from './lib/period'
import { useQuery } from './lib/useQuery'

function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useSearchParams()
  const from = params.get('from'), to = params.get('to')
  const period = useMemo<Period>(() => (from && to && isValidDate(from) && isValidDate(to) ? { from, to } : DEFAULT_PERIOD), [from, to])
  const setPeriod = useCallback((p: Period) => setParams({ from: p.from, to: p.to }), [setParams])
  return <PeriodContext.Provider value={{ period, setPeriod }}>{children}</PeriodContext.Provider>
}

function Shell() {
  const names = useQuery(async () => Object.fromEntries((await getCases()).map((c) => [c.case_key, c.name])), [])
  return (
    <PeriodProvider>
      <Layout agentNames={names.data ?? {}}>
        <Routes>
          <Route path="/" element={<Cockpit />} />
          <Route path="/agents/:key" element={<Agent />} />
        </Routes>
      </Layout>
    </PeriodProvider>
  )
}

export default function App() {
  return <BrowserRouter><Shell /></BrowserRouter>
}

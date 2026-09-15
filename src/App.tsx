import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Agent } from './pages/Agent'
import { Cockpit } from './pages/Cockpit'
import { getCases } from './lib/data'
import { useQuery } from './lib/useQuery'

export default function App() {
  const names = useQuery(async () => Object.fromEntries((await getCases()).map((c) => [c.case_key, c.name])), [])
  return (
    <BrowserRouter>
      <Layout agentNames={names.data ?? {}}>
        <Routes>
          <Route path="/" element={<Cockpit />} />
          <Route path="/agents/:key" element={<Agent />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Agent } from './pages/Agent'
import { Cockpit } from './pages/Cockpit'

export default function App() {
  return (
    <BrowserRouter>
      <Layout agentNames={{}}>
        <Routes>
          <Route path="/" element={<Cockpit />} />
          <Route path="/agents/:key" element={<Agent />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

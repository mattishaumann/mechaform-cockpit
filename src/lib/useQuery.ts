import { useEffect, useRef, useState } from 'react'

export interface QueryState<T> { data: T | null; error: string | null; loading: boolean }

// Latest request wins. An older answer is still shown while nothing is on screen yet, so a burst of live events
// (for example during "Run all agents") cannot keep the first load on its skeleton by restarting it again and again.
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[]): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ data: null, error: null, loading: true })
  const latest = useRef(0)
  useEffect(() => {
    const id = ++latest.current
    setState((s) => ({ ...s, loading: true, error: null }))
    fn().then((data) => setState((s) => (id === latest.current ? { data, error: null, loading: false } : s.data === null ? { data, error: null, loading: true } : s)))
      .catch((e: Error) => { if (id === latest.current) setState({ data: null, error: e.message, loading: false }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

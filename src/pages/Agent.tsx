import { useParams } from 'react-router-dom'

export function Agent() {
  const { key } = useParams()
  return <h1 className="text-3xl font-semibold tracking-tight">{key}</h1>
}

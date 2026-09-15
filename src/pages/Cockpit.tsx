import { copy } from '../copy'

export function Cockpit() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">{copy.cockpit.title}</h1>
      <p className="mt-2 max-w-prose text-text-muted">{copy.cockpit.subtitle}</p>
    </section>
  )
}

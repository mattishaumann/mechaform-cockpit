import { copy } from '../copy'
import { Pill } from '../components/Pill'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'

// Where the MVP uses a language model and where it does not. Static on purpose: the statements are checked against the
// Edge Functions and the benchmark seed, and the page must read the same whatever state the database is in.
export function AiUse() {
  const t = copy.aiUse
  return (
    <section data-testid="ai-use">
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-2 max-w-prose text-text-muted">{t.subtitle}</p>

      <h2 className={`${label} mt-8`}>{t.modelTitle}</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg text-left font-mono text-xs uppercase tracking-widest text-text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-normal">{t.cols.where}</th>
              <th scope="col" className="px-4 py-3 font-normal">{t.cols.does}</th>
              <th scope="col" className="px-4 py-3 font-normal">{t.cols.rules}</th>
              <th scope="col" className="px-4 py-3 font-normal">{t.cols.guard}</th>
              <th scope="col" className="px-4 py-3 font-normal">{t.cols.runs}</th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r) => (
              <tr key={r.key} data-testid="ai-surface" data-surface={r.key} className="border-t border-border align-top">
                <th scope="row" className="px-4 py-3 text-left font-medium">{r.where}</th>
                <td className="px-4 py-3">{r.does}</td>
                <td className="px-4 py-3 text-text-muted">{r.rules}</td>
                <td className="px-4 py-3 text-text-muted">{r.guard}</td>
                <td className="px-4 py-3">{r.runs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div data-testid="ai-no-model" className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2"><h2 className={label}>{t.noModelTitle}</h2><Pill tone="positive">SQL</Pill></div>
          <ul className="mt-3 space-y-2 text-sm">{t.noModel.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <div data-testid="ai-common" className="rounded-lg border border-border bg-surface p-5">
          <h2 className={label}>{t.commonTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm">{t.common.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>

      <div data-testid="ai-built" className="mt-4 rounded-lg border border-dashed border-border-strong bg-surface p-5">
        <h2 className={label}>{t.builtTitle}</h2>
        <p className="mt-2 max-w-prose text-sm text-text-muted">{t.built}</p>
      </div>
    </section>
  )
}

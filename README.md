# mechaform-cockpit

Tacto-branded, read-only procurement cockpit for MechaForm GmbH. Shows the savings agents found in the 2026 order history, reading pre-computed cases, flagged rows and descriptive figures from a Supabase project. Nothing is recomputed in the browser.

Spec of record: `~/dev/mattis-vault/cases/tacto/specs/mvp-cockpit.md`.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev
```

Environment variables:

| Variable | Meaning |
|---|---|
| `VITE_SUPABASE_URL` | Project URL, e.g. `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The project's anon key (public by design; the database allows select only) |
| `VITE_ENABLED_AGENTS` | Comma-separated case keys to show, default `contract_guard,tier_guard` |
| `VITE_RUN_INTERVAL_MS` | Interval of the simulated "last agent run" timestamp, default 60000 |

## Checks

`npm run check` runs typecheck, unit tests, the UI gate (`scripts/check-ui.sh`) and the Playwright suite against the live project, including the configuration, last-run, empty-state and error-state runs.

## Deploy

```bash
npx vercel --prod
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project first. `vercel.json` carries the Vite build and the single-page rewrite.

## Adding an agent

One entry in `src/lib/agents.ts` (module, register layers, optional extras), its row in `mvp_cases`, its rows in `mvp_register`, then add the case key to `VITE_ENABLED_AGENTS`.

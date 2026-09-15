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

## Run model

Each agent is a Postgres function in the Supabase project (`run_contract_guard`, `run_tier_guard` plus its annual layer, `run_terms_floor`, `run_price_radar`, `run_preferred_steering`), reached through one entry point `run_agent(agent, period_start, period_end)`. A run replaces that agent's rows in `mvp_register` for the period, records itself in `agent_runs`, and stores its gap-by-month trend in `agent_trend`. The functions are security definer; the anon role can call `run_agent` and read, but cannot write tables directly. The browser subscribes to `mvp_register` and `agent_runs` through Supabase Realtime, so findings and run status appear without a reload. The period comes from the URL (`?from=&to=`), default calendar 2026, with year, quarter and month presets and a custom range. Nothing is computed in the browser.

## Adding an agent

1. Write `run_<agent>(p_start date, p_end date)` in `supabase/sql/live_functions.sql` following the existing ones (open a run, insert findings with `run_id`, close the run) and add its branch to `run_agent`.
2. Add its row to `mvp_cases` (name, rule, trigger, evidence, calculation, action, confidence) and its entry in `src/lib/agents.ts` (module, register layers, optional extras).
3. Add the case key to `VITE_ENABLED_AGENTS`.

## Parity with the notebook

`supabase/sql/verify_runs.sql` (in the dataset folder) runs all five agents over 2026 and prints rows and totals per run. They must match the analysis notebook to the euro: Contract Guard 675,529; Tier Guard 254,503 and 600,692; Terms Floor 1,017,963; Price Radar 3,341,179; Preferred Steering 1,639,801. The Q1 2026 block checks period semantics (Contract Guard 9 rows, 173,134; Tier Guard 95 rows, 64,371).

## Checks

`npm run check` runs typecheck, unit tests, the UI gate (`scripts/check-ui.sh`) and the Playwright suite against the live project, including the three-agent and five-agent configuration runs and the empty-state and error-state runs. The live tests trigger real agent runs on the project.

## Deploy

```bash
npx vercel --prod
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project first. `vercel.json` carries the Vite build and the single-page rewrite.

## Adding an agent

One entry in `src/lib/agents.ts` (module, register layers, optional extras), its row in `mvp_cases`, its rows in `mvp_register`, then add the case key to `VITE_ENABLED_AGENTS`.

## Language-model drafts

One Supabase Edge Function, `draft-action`, turns a finding's evidence into a German supplier message (Belastungsanzeige, Preiskorrektur, Konditionenanfrage) or an internal briefing (Verhandlungsbriefing) for the internal-only cases. The rules computed every number; the model only writes language from the payload it receives and must echo every number it uses with its source field. The function checks the answer (numbers present in the input, orders present in the evidence, no forbidden words, no recovery language in briefings), stores passing drafts in `mvp_drafts`, logs every call with an estimated cost in `mvp_llm_calls`, serves cached drafts first, and stops at a cumulative 3.50 USD. Model: Haiku 4.5, 700 output tokens, cached system block.

Secrets, set once by hand and never committed:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env.local
```

The scripts read `.env.local` (gitignored). `npm run llm:tests` runs the three brief cases once against the API; `npm run llm:precompute` drafts the three highest-gap findings per case and prints the spend, stopping above 1 USD. In the app, "Aktion entwerfen" on a finding shows the draft next to its evidence; "Als gesendet markieren (Simulation)" only changes the status and never sends anything.

Drafts survive agent re-runs. A run replaces the register rows of its period, so `mvp_drafts` carries the finding's natural key (case, supplier, article, order, volume, baseline, period) and `close_run` re-links every stored draft to the new row and restores statuses other than open (`supabase/sql/active_carry.sql` in the dataset folder). "Run all agents" therefore never discards the precomputed drafts.


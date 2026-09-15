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

Each agent is a Postgres function in the Supabase project (`run_contract_guard`, `run_tier_guard` plus its annual layer, `run_terms_floor`, `run_price_radar`, `run_preferred_steering`), reached through one entry point `run_agent(agent, period_start, period_end)`. A run upserts its findings into `mvp_register` on a natural key (case, order and position for line-level findings; case, supplier and article for pair-level ones; always with the period), prunes the findings of that case and period it no longer produces, records itself in `agent_runs`, and stores its gap-by-month trend in `agent_trend`. Register ids, statuses, drafts and tasks therefore survive reruns. The functions are security definer; the anon role can call `run_agent` and read, but cannot write tables directly. The browser subscribes to `mvp_register` and `agent_runs` through Supabase Realtime, so findings and run status appear without a reload. The period comes from the URL (`?from=&to=`), default calendar 2026, with year, quarter and month presets and a custom range. Nothing is computed in the browser.

## Adding an agent

1. Write `run_<agent>(p_start date, p_end date)` in `supabase/sql/reco_harness.sql` following the existing ones (open a run, upsert findings with `run_id` on the finding key, close the run) and add its branch to `run_agent`.
2. Add its row to `mvp_cases` (name, rule, trigger, evidence, calculation, action, confidence) and its entry in `src/lib/agents.ts` (module, register layers, optional extras).
3. Add the case key to `VITE_ENABLED_AGENTS`.

## Parity with the notebook

`supabase/sql/verify_runs.sql` (in the dataset folder) runs all five agents over 2026 and prints rows and totals per run. They must match the analysis notebook to the euro: Contract Guard 675,529; Tier Guard 254,503 and 600,692; Terms Floor 1,017,963; Price Radar 3,341,179; Preferred Steering 1,639,801. The Q1 2026 block checks period semantics (Contract Guard 9 rows, 173,134; Tier Guard 95 rows, 64,371).

## Who acts

Every finding carries a `recommendation` (jsonb on `mvp_register`), filled in SQL when a run closes (`supabase/sql/reco_recommend.sql` in the dataset folder): the internal recipients with the reason and a due date, the external message when there is one, the order (internal first, external first, internal only) and one rationale sentence built from the finding's own numbers with a fixed template. No model is involved. The identities come from the data as far as it goes:

- **Einkäufer**: `order_headers.buyer_no` of the order (five buyers: 3400, 4471, 8190, 9215, A124). There is no buyer master table and no name anywhere in the export, so the app shows "Einkäufer {buyer_no}".
- **Plant**: `order_items.plant` carries code and name (01_01 Augsburg, 01_02 Chemnitz, 01_03 Hamburg); it is shown next to the buyer where the rule is plant-specific.
- **Kategorieeinkauf**: the category buyer is represented by the purchasing organisation (`purchasing_organization_no`, 0010, 0020, 0030) with the most volume or spend on the pair or article; every buyer orders in all three, so there is no person to name.
- **Finanzen** and **Qualität**: roles, not people. The export has no finance or quality contact; the card labels them "Rolle, keine Person".

"Aufgabe anlegen" writes a row to `mvp_tasks` through `create_task` (idempotent per finding and recipient) and moves the finding to "in Bearbeitung"; nothing is sent. Thresholds and due days live in `mvp_config`.

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

Drafts survive agent re-runs because a rerun keeps each finding's id (`supabase/sql/reco_harness.sql` in the dataset folder replaced the earlier carry-over in `active_carry.sql`). "Run all agents" therefore never discards the precomputed drafts.


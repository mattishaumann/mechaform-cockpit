# MechaForm procurement cockpit

Savings agents that read MechaForm's own order history and turn what they find into something a buyer can act on. Every figure on screen comes from the database, computed by a named rule over a named period; the browser displays, it never calculates.

Live: https://mechaform-cockpit.vercel.app

## Run it

```bash
npm install
cp .env.example .env.local   # VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
npm run check                # types, unit tests, UI gate, end-to-end suite
```

The anon key is public by design: the database grants select only, and every write goes through a security-definer function.

## One shape for every agent

An agent is a Postgres function, not a script. `run_agent(key, from, to)` dispatches to `run_<agent>(from, to)`, which upserts its findings into `mvp_register` on the finding's natural key, prunes what it no longer produces, and records the run in `agent_runs`. Rerunning a period is therefore free of duplicates, and the ids, statuses, tasks and drafts attached to a finding survive it. The cockpit reads `mvp_cases` for what each agent claims to do, so a new agent is one function, one row and one entry in `src/lib/agents.ts`. Thresholds (tolerances, financing rate, Skonto day, due days) live in `mvp_config` rather than in code, so the same rule can be re-run under a different assumption.

Each finding is `volume × (what we paid − what the rule says we should have paid)` over the selected period. What the target price is depends on the case:

| Agent | Finding | Target price | 2026 |
|---|---|---|---|
| Contract Guard | Order lines placed without the framework contract that exists for that supplier and article | The agreed contract price | €675,529 |
| Tier Guard | Quantities that reached a price tier the order did not use, per order and per year | The tier price the quantity earned | €605,424 |
| Terms Floor | Suppliers who grant an early-payment discount on some lines and withhold it on others | The best rate that supplier already grants, net of the cost of paying early | €1,017,963 |

The headline counts each article once (**€2,298,917** hard savings for 2026; €2,548,687 gross before the overlap between cases is removed) through the view `v_savings_split`. Nothing else is added to it.

## From a finding to an action

Every finding carries a `recommendation`, built in SQL from its own numbers: who acts internally, who is written to externally, in which order, and one sentence of reasoning. It also offers scenarios the way a procurement tool suggests next moves: what to do, what it is worth, and what to do first. Tasks are real rows (`mvp_tasks`), so the register can be filtered by the role a recommendation lands on, and the activity feed records what happened.

Who acts comes from the data as far as it goes: the export has no buyer master, so a recommendation names "Einkäufer {buyer_no}" from the order and the plant from its line, Kategorieeinkauf is the purchasing organisation with the most volume on the article, and Finanzen and Qualität are labelled as roles rather than people. Where the channel is a letter to the supplier, a draft is generated and marked as a draft to review before sending.

## Preview agents

Three agents run beside the verified ones. They are marked preview, they never enter a total, and each page says why:

- **Index Guard** escalates every supplier and article's base-year price with a cost basket for its category (material, energy, labour, fixed share) and flags what sits above the band. It recommends renegotiating with the suppliers furthest above their index and hands the case to the trainer. The index series are generated sample data until a real feed is loaded through `supabase/index/load_index.py` (three CSVs: definitions, monthly values, basket weights), every screen that shows them says so, and the basket weights and the tolerance need tuning before any supplier conversation.
- **External Price Benchmark** infers the real part behind an article that has no manufacturer part number, compares MechaForm's price with public web prices and sizes the gap as a range. Four articles are matched today; the page shows what the same scan needs at scale and never presents the range as confirmed savings.
- **Negotiation trainer** turns a finding into a practice conversation: the supplier's representative answers from the brief's facts, a coach scores each turn, and the opening message is written from the supplier's own figures.

## Where a model is used, and where it is not

Rules decide; the model only writes language. It is called for supplier drafts and for the trainer, always with a fixed payload, a forced output schema and post-checks that reject a reply using a number that is not in its input, leaking the prompt, or breaking the house style. Every call is logged with its tokens and cost in `mvp_llm_calls`, a budget guard stops the spend, and anything a supplier or a user typed is passed as delimited, untrusted content. A rejected reply is stored with its reason instead of being shown.

## Saying what the numbers are worth

Assumptions are labelled where they appear, not in a footnote: the sample index data, the invented supplier contact in the trainer, the benchmark's low-confidence range, the cost avoidance that is deliberately kept out of the savings headline. An agent whose basis is an assumption is a preview agent and stays out of every total.

## Layout

```
src/pages           cockpit, agent page, register, trainer
src/components      strategy cards, evidence drawer, recommendation and scenario cards, charts
src/lib             agent registry, typed data access, one query hook
src/copy.ts         all UI copy in one place
src/styles          design tokens; components reference semantic tokens only
e2e                 one spec per acceptance criterion, run against the live database
supabase/functions  the two model-facing Edge Functions
```

The SQL that defines the agents, the views and the seeds lives with the dataset (`supabase/sql/`) and is applied with `supabase db query --linked --file`.

## Checks

`npm run check` runs the types, the unit tests, a UI gate (tokens only, no stray hex, every interactive state present) and the end-to-end suite, including the runs that need their own environment. The agents are additionally checked against the analysis notebook to the euro (`verify_runs.sql`, `reco_checks.py`, `benchmark_checks.py`), so a change that moves a number fails loudly rather than quietly.

## Deploy

```bash
npx vercel --prod
```

## Where a language model is used

The page /ai ("AI in this MVP" in the navigation) states it for the demo; this is the same list.

| Where | What the model does | When it runs |
|---|---|---|
| Drafts on a finding (`draft-action`) | Writes the German supplier letter or an internal briefing; every number comes from the finding and is echoed with its source, claims cite order numbers, a check rejects any number not in the input, nothing is sent | On request, stored; prepared drafts load without a call |
| Negotiation trainer (`trainer-turn`) | Plays the supplier's key account manager and a coach; the brief is built by rules, the supplier text is content inside `untrusted_data` with a canary | Live, one call per turn, up to 8 turns per session; the stored Arnold example replays without a call |
| External Price Benchmark | Guessed the part behind four articles and researched web prices with links | Once, offline, 2026-09-15; stored as the seed |

No model: Contract Guard, Tier Guard, Terms Floor, Index Guard (SQL formula, sample index from a script), recommendations, scenarios, tasks and every total. Around every call: Claude Haiku 4.5 from server functions only, a forced output schema, every call stored in `mvp_llm_calls` with tokens and cost, one shared budget cap of $3.50.

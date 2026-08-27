# Persistencia Supabase AI Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Supabase-backed persistence path for AI Radar signals while preserving the current local JSON fixture contract.

**Architecture:** Keep the current fixture workflow as the offline/local contract and add Supabase as the durable store behind server-side scripts/API routes. Source discovery continues to use Notion/cache; signal persistence moves through a server-side boundary that validates payloads before writing to Supabase.

**Tech Stack:** Plain JavaScript/Node, Supabase CLI, Supabase Postgres, server-side API handlers, Python validation scripts retained for fixture validation.

**Spec:** User request on 2026-08-26: plan persistence with Supabase plugin connection, development project, minimum tables, env vars, server-side API, new `guardar-senales-airadar` skill, changes to search skill, validation, risks, and approval points.

## Global Constraints

- Do not claim Supabase is connected until a real project ref, credentials, and verification command exist.
- Do not expose service role keys in browser code or committed files.
- Keep `data/fixtures/daily-signals/YYYY-MM-DD.json` compatible with `schemas/ai-radar-daily-signals.schema.json`.
- Preserve Notion-efficient source loading: `config/sources.json` is cache-first unless source rows are changing.
- Use server-side writes for Supabase persistence.
- Keep destructive database operations behind explicit user approval.

---

## Current State Summary

Evidence from the repo:

- Local daily signal contract exists in `docs/daily-signals-contract.md`.
- JSON Schema exists in `schemas/ai-radar-daily-signals.schema.json`.
- Fixtures exist in `data/fixtures/daily-signals/`.
- Local query and validation scripts exist in `scripts/query-daily-signals.py` and `scripts/validate-primary-sources.py`.
- Tests exist and currently pass: `python3 -m unittest discover -s tests` runs 7 tests successfully.
- Implemented on 2026-08-27: `package.json`, `package-lock.json`, `src/server/`, `api/daily-signals.js`, `supabase/migrations/0001_initial_ai_radar.sql`, `.env.example`, `docs/supabase-persistence.md`, and Node tests under `tests/server/`.
- Supabase CLI is installed globally, but the repo is not linked to a Supabase project.

## Implementation Status 2026-08-27

Implemented locally on `main`:

- Server-side Supabase boundary:
  - `src/server/env.js`
  - `src/server/supabase-client.js`
  - `src/server/daily-signal-schema.js`
  - `src/server/signal-repository.js`
  - `api/daily-signals.js`
- Migration:
  - `supabase/migrations/0001_initial_ai_radar.sql`
  - Tables: `daily_runs`, `signals`, `signal_sources`, `source_catalog`
  - RLS enabled on all `public` tables; no public policies added yet.
- Validation:
  - `scripts/validate-daily-signal-schema.js`
  - AJV draft 2020-12 support via `ajv/dist/2020` and `ajv-formats`.
- Documentation:
  - `.env.example`
  - `docs/supabase-persistence.md`
  - `README.md` current-state section.
- Skills:
  - Created `/home/violet_tachyon/.codex/skills/guardar-senales-airadar/SKILL.md`.
  - Updated `/home/violet_tachyon/.codex/skills/ai-radar-news-signals/SKILL.md` to delegate saving to `guardar-senales-airadar`.

Validated:

```bash
npm test
python3 -m unittest discover -s tests
node scripts/validate-daily-signal-schema.js data/fixtures/daily-signals/2026-08-04.json
python3 /home/violet_tachyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py /home/violet_tachyon/.codex/skills/guardar-senales-airadar
supabase --version
```

Observed results:

- Node tests: 2 files pass.
- Python tests: 7 tests pass.
- Fixture schema validation: `OK data/fixtures/daily-signals/2026-08-04.json`.
- Skill validation: `Skill is valid!`.
- Supabase CLI: `2.116.0`.

Not completed because it requires environment or explicit approval:

- Completed: local `.env` has a real JWT-shaped `service_role` key for project `bvusrzehyffywwxvlatk`; `npm run check:supabase` passes.
- Authenticate local CLI with `supabase login`.
- Link local CLI with `supabase link --project-ref bvusrzehyffywwxvlatk`.
- Verify live POST/GET API calls through the local/server runtime after `.env` has service role credentials.
- Completed: `npm run check:supabase` validates local env, service role auth, and table access without printing secret values.

Remote Supabase status verified on 2026-08-27:

- MCP/plugin is authenticated and connected to `https://bvusrzehyffywwxvlatk.supabase.co`.
- Remote migrations applied:
  - `20260827202307 initial_ai_radar`
  - `20260827202416 set_updated_at_search_path`
  - `20260827205230 grant_ai_radar_tables_to_service_role`
  - `20260827205317 revoke_ai_radar_public_table_grants`
- Remote tables exist with RLS enabled:
  - `daily_runs`
  - `signals`
  - `signal_sources`
  - `source_catalog`
- `source_catalog` has four active rows, one per agent type.
- Connectivity write test inserted and then explicitly cleaned up a run, signal, and signal source; remaining test rows: 0.
- Security advisors only report informational `rls_enabled_no_policy` notices, expected because v1 uses service-role server-side writes and no public table policies.
- Local readiness verifier added: `scripts/check-supabase-readiness.js`.
- Debug finding: the correct `service_role` JWT still returned `permission denied for table ...` until Data API table grants were explicitly added for `service_role`; public grants for `anon` and `authenticated` were then revoked.

## Target Persistence Flow

```text
News search skill
  -> validates signal shape
  -> optional fixture write
  -> guardar-senales-airadar skill
  -> server-side API or script
  -> Supabase Postgres
  -> validation query / response IDs
```

For source configuration:

```text
Notion AI Radar Sources
  -> config/sources.json cache
  -> search agents
```

For signal persistence:

```text
Daily signal JSON contract
  -> normalized signal rows
  -> Supabase tables
```

## Minimum Supabase Tables

### `daily_runs`

Purpose: one record per daily search execution.

Columns:

```sql
create table public.daily_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  prompt text not null,
  language text not null default 'es',
  topics text[] not null default '{}',
  generated_at timestamptz not null,
  source_mode text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (run_date, prompt)
);
```

### `signals`

Purpose: one normalized signal per event/news item.

Columns:

```sql
create table public.signals (
  id text primary key,
  run_id uuid not null references public.daily_runs(id) on delete cascade,
  title text not null,
  source_name text not null,
  source_url text not null,
  published_at date not null,
  evidence text not null,
  impact_level text not null check (impact_level in ('low', 'medium', 'medium-high', 'high', 'critical')),
  impact_summary text not null,
  action text not null,
  status text not null check (status in ('active', 'monitor', 'investigating', 'open-opportunity', 'pending-litigation')),
  tags text[] not null default '{}',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `signal_sources`

Purpose: optional structured corroboration and provenance per signal.

```sql
create table public.signal_sources (
  id uuid primary key default gen_random_uuid(),
  signal_id text not null references public.signals(id) on delete cascade,
  name text not null,
  url text not null,
  source_type text not null check (source_type in ('primary', 'secondary', 'community', 'technical')),
  published_at date,
  note text,
  created_at timestamptz not null default now(),
  unique (signal_id, url)
);
```

### `source_catalog`

Purpose: Supabase mirror/cache of source rows currently maintained in Notion.

```sql
create table public.source_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  agent_type text not null check (agent_type in ('fuente_oficial', 'repo_tecnico', 'comunidad', 'medio_secundario')),
  priority integer not null,
  status text not null default 'Done',
  active boolean not null default true,
  origin text not null default 'notion',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Environment Variables

Create `.env.example`:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=replace-with-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project-ref.supabase.co:5432/postgres
AI_RADAR_API_TOKEN=replace-with-local-dev-token
```

Rules:

- `SUPABASE_SERVICE_ROLE_KEY` is server-side only.
- `SUPABASE_ANON_KEY` can be used by future browser reads only after RLS policies exist.
- `.env` must stay ignored.
- `.env.example` must contain placeholders only.

## API Server-Side Shape

Add a small server-side API surface after Node scaffolding exists:

```text
src/server/
  env.js
  supabase-client.js
  signal-repository.js
api/
  daily-signals.js
```

`POST /api/daily-signals`:

- Auth: `Authorization: Bearer $AI_RADAR_API_TOKEN`.
- Body: full daily JSON contract.
- Validates schema.
- Upserts `daily_runs`.
- Upserts `signals`.
- Replaces `signal_sources` for each signal.
- Returns inserted/updated counts and IDs.

`GET /api/daily-signals?day=YYYY-MM-DD&limit=5&order=impact-desc`:

- Auth: `Authorization: Bearer $AI_RADAR_API_TOKEN`.
- Reads from Supabase.
- Returns the same shape as `scripts/query-daily-signals.py`.

## Supabase Plugin / Project Setup

Preferred setup:

1. Install/use Supabase plugin or connector if available in Codex for direct project operations.
2. Create a development Supabase project named `ai-radar-dev`.
3. Link local repo:

```bash
supabase login
supabase link --project-ref <project-ref>
```

4. Generate migrations in `supabase/migrations/`.
5. Apply migrations:

```bash
supabase db push
```

Fallback if plugin is unavailable:

- Use Supabase dashboard to create the project.
- Use installed Supabase CLI for `login`, `link`, and migrations.

## New Skill: `guardar-senales-airadar`

Create `/home/violet_tachyon/.codex/skills/guardar-senales-airadar/SKILL.md`.

Trigger:

```yaml
---
name: guardar-senales-airadar
description: Use when the user asks to save, persist, upload, sync, or store AI Radar daily signals or signal search results in Supabase, fixtures, or both.
---
```

Core behavior:

1. Validate the daily JSON contract first.
2. Prefer saving both local fixture and Supabase when Supabase is configured.
3. If Supabase is not configured, save fixture only and report missing env vars.
4. Use server-side API/script, never browser-side service role key.
5. Confirm write from API response IDs/counts; avoid extra Supabase read unless requested.
6. If Supabase write fails, keep the fixture and report retry command.

## Changes To `ai-radar-news-signals`

Update the existing skill:

- Replace “If the user asks to save the search…” with a handoff to `guardar-senales-airadar`.
- Keep fixture-only fallback when Supabase is not configured.
- Add “do not write directly to Supabase from search agents”.
- Add “produce a daily JSON payload first, then call the save skill”.
- Add “report persistence mode: fixture-only, fixture+supabase, or supabase-failed-fixture-saved”.

## Validation Strategy

Local validation:

```bash
python3 -m unittest discover -s tests
node -e "JSON.parse(require('fs').readFileSync('config/sources.json','utf8'))"
```

Schema validation:

- Add a Node validator using `ajv` and `ajv-formats` after `package.json` exists.
- Keep Python scripts for fixture query/primary-source validation.

Supabase validation:

```bash
supabase status
supabase db push --dry-run
```

After credentials exist:

```bash
curl -X POST http://localhost:3000/api/daily-signals \
  -H "Authorization: Bearer $AI_RADAR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data @data/fixtures/daily-signals/2026-08-04.json
```

Expected response:

```json
{
  "runId": "uuid",
  "signalsInserted": 5,
  "signalsUpdated": 0,
  "sourcesInserted": 4
}
```

## Risks

- **Secret leakage:** service role key must never be committed or exposed client-side.
- **Schema drift:** JSON fixture contract and Supabase tables can diverge unless mapping tests exist.
- **RLS confusion:** service-side writes can bypass RLS, but browser reads need explicit policies later.
- **Duplicate signals:** signal `id` may collide across days if ids are not stable enough. Mitigation: either keep global stable ids or use `(run_id, id)` instead of `id` primary key.
- **Notion/Supabase dual source of truth:** Notion currently owns source catalog; Supabase should mirror/cache until product requirements say otherwise.
- **Connector limits:** Supabase or Notion plugin calls may have plan/rate limits. Prefer write-response verification and local cache.
- **Premature API complexity:** The repo has no frontend/API yet. Keep the first API thin and server-side only.

## Steps Requiring Approval

- Installing npm dependencies or creating `package.json`.
- Running commands that access the network: `supabase login`, `supabase link`, `supabase db push`, npm install, API tests against Supabase.
- Creating a Supabase development project through plugin/dashboard.
- Applying migrations to any remote database.
- Writing `.env` with real secrets.
- Enabling public read policies or changing RLS.
- Any destructive migration: dropping columns, dropping tables, deleting rows.

---

## Implementation Tasks

### Task 1: Supabase Project Scaffolding

**Files:**
- Create: `supabase/migrations/0001_initial_ai_radar.sql`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Produces: migration tables `daily_runs`, `signals`, `signal_sources`, `source_catalog`.
- Produces: env var names consumed by API/server scripts.

- [x] **Step 1: Create migration with the SQL from Minimum Supabase Tables**
- [x] **Step 2: Create `.env.example` with placeholder variables**
- [x] **Step 3: Confirm `.env` is ignored in `.gitignore`**
- [ ] **Step 4: Run local syntax sanity check**

```bash
supabase db lint
```

Status: attempted on 2026-08-27. Blocked because local Supabase Postgres was not running (`ECONNREFUSED 127.0.0.1:54322`). Requires `supabase start` or a linked project.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_initial_ai_radar.sql .env.example .gitignore
git commit -m "feat: add supabase persistence schema"
```

### Task 2: Node Server-Side Persistence Boundary

**Files:**
- Create: `package.json`
- Create: `src/server/env.js`
- Create: `src/server/supabase-client.js`
- Create: `src/server/signal-repository.js`
- Create: `api/daily-signals.js`
- Create: `tests/server/signal-repository.test.js`

**Interfaces:**
- Produces: `saveDailySignals(payload)` returning `{ runId, signalsInserted, signalsUpdated, sourcesInserted }`.
- Consumes: daily JSON payload compatible with `schemas/ai-radar-daily-signals.schema.json`.

- [x] **Step 1: Add failing tests for mapping daily JSON to repository rows**
- [x] **Step 2: Add minimal Node project dependencies**

```bash
npm install @supabase/supabase-js ajv ajv-formats
```

- [x] **Step 3: Implement env validation**
- [x] **Step 4: Implement server-side Supabase client using `SUPABASE_SERVICE_ROLE_KEY`**
- [x] **Step 5: Implement repository upsert logic**
- [x] **Step 6: Implement `POST /api/daily-signals` and authenticated `GET /api/daily-signals`**
- [x] **Step 7: Run tests**

```bash
npm test
python3 -m unittest discover -s tests
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src api tests/server
git commit -m "feat: add server-side signal persistence"
```

### Task 3: Save Skill

**Files:**
- Create: `/home/violet_tachyon/.codex/skills/guardar-senales-airadar/SKILL.md`
- Modify: `/home/violet_tachyon/.codex/skills/ai-radar-news-signals/SKILL.md`

**Interfaces:**
- Produces: skill handoff from search to save.
- Consumes: daily JSON payload and persistence mode.

- [x] **Step 1: Create `guardar-senales-airadar` skill with the behavior above**
- [x] **Step 2: Update `ai-radar-news-signals` to hand off save operations to the new skill**
- [x] **Step 3: Verify skill text includes Supabase, fixture fallback, server-side API, and write-response verification**

```bash
rg -n "guardar-senales-airadar|Supabase|fixture|server-side|write-response" /home/violet_tachyon/.codex/skills/ai-radar-news-signals/SKILL.md /home/violet_tachyon/.codex/skills/guardar-senales-airadar/SKILL.md
```

### Task 4: Validation And Developer Workflow

**Files:**
- Create: `docs/supabase-persistence.md`
- Modify: `README.md`
- Create: `scripts/validate-daily-signal-schema.js`

**Interfaces:**
- Produces: documented commands for local fixture validation and Supabase persistence validation.

- [x] **Step 1: Add schema validation script using `ajv`**
- [x] **Step 2: Document setup and approval-required commands**
- [x] **Step 3: Document fallback behavior when Supabase is not configured**
- [x] **Step 4: Run validation**

```bash
node scripts/validate-daily-signal-schema.js data/fixtures/daily-signals/2026-08-04.json
python3 -m unittest discover -s tests
```

- [ ] **Step 5: Commit**

```bash
git add docs/supabase-persistence.md README.md scripts/validate-daily-signal-schema.js
git commit -m "docs: document supabase persistence workflow"
```

## Execution Recommendation

Do Task 1 first. Stop before `supabase db push` until a development Supabase project exists and the user approves linking/applying migrations.

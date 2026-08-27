# Supabase Persistence

AI Radar keeps `data/fixtures/daily-signals/YYYY-MM-DD.json` as the local/offline contract and adds Supabase as a durable server-side store.

## Connected Project

- Project URL: `https://bvusrzehyffywwxvlatk.supabase.co`
- Remote migrations applied:
  - `20260827202307 initial_ai_radar`
  - `20260827202416 set_updated_at_search_path`
  - `20260827205230 grant_ai_radar_tables_to_service_role`
  - `20260827205317 revoke_ai_radar_public_table_grants`
- Remote tables:
  - `daily_runs`
  - `signals`
  - `signal_sources`
  - `source_catalog`
- `source_catalog` has one active source per agent type.
- RLS is enabled on all AI Radar tables. No public read/write policies are enabled in v1; writes go through server-side service role.
- Table grants are explicit: `service_role` can access AI Radar tables; `anon` and `authenticated` table grants are revoked.

## Local Setup

1. Copy `.env.example` to `.env` and fill the secret values locally.
2. Get `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard -> Project Settings -> API. Keep it server-side only.
3. Set `AI_RADAR_API_TOKEN` to a local random bearer token for the AI Radar API.
4. Verify local API readiness:

```bash
npm run check:supabase
```

Expected success:

```json
{
  "ok": true,
  "missing": [],
  "projectUrlConfigured": true,
  "tablesChecked": [
    "daily_runs",
    "signals",
    "signal_sources",
    "source_catalog"
  ],
  "tableErrors": [],
  "secretValuesPrinted": false
}
```

5. Link the CLI when local Supabase CLI auth is needed:

```bash
supabase login
supabase link --project-ref bvusrzehyffywwxvlatk
```

6. Review future migrations before applying them:

```bash
supabase db lint
```

7. Apply future migrations only with explicit approval:

```bash
supabase db push
```

## API

`POST /api/daily-signals` requires:

```http
Authorization: Bearer $AI_RADAR_API_TOKEN
Content-Type: application/json
```

The request body must match `schemas/ai-radar-daily-signals.schema.json`. The API validates, upserts `daily_runs`, upserts `signals`, replaces `signal_sources`, and returns write counts.

`GET /api/daily-signals?day=YYYY-MM-DD&limit=5&order=impact-desc` also requires the bearer token and returns `day`, `order`, `limit`, `count`, `query`, and `signals`, matching the local query shape.

`SUPABASE_SERVICE_ROLE_KEY` is read only by server-side modules under `src/server/`; do not expose it in browser code, fixtures, or generated reports.

## Current Auth Boundaries

- MCP/plugin auth is active and can manage the connected Supabase project.
- Local CLI auth still requires `supabase login`.
- Local `.env` exists, is git-ignored, has a generated `AI_RADAR_API_TOKEN`, and has been verified with the service role key.
- Local API auth is verified by `npm run check:supabase`.
- The connector exposes publishable keys, but it does not expose the service role key.

## Debug Note

If `npm run check:supabase` returns `permission denied for table ...` while the JWT payload role is `service_role`, the key can be correct while table grants are missing. For SQL-created tables, grant Data API table access explicitly to `service_role` and keep public roles closed:

```sql
grant usage on schema public to service_role;
grant all privileges on table public.daily_runs to service_role;
grant all privileges on table public.signals to service_role;
grant all privileges on table public.signal_sources to service_role;
grant all privileges on table public.source_catalog to service_role;

revoke all privileges on table public.daily_runs from anon, authenticated;
revoke all privileges on table public.signals from anon, authenticated;
revoke all privileges on table public.signal_sources from anon, authenticated;
revoke all privileges on table public.source_catalog from anon, authenticated;
```

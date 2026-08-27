const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSupabaseReadinessReport,
  parseDotEnv
} = require("../../scripts/check-supabase-readiness");

test("parses simple dotenv content without exposing secrets", () => {
  assert.deepEqual(
    parseDotEnv(`
SUPABASE_URL=https://example.supabase.co
SUPABASE_SERVICE_ROLE_KEY=secret-value
AI_RADAR_API_TOKEN="local-token"
`),
    {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret-value",
      AI_RADAR_API_TOKEN: "local-token"
    }
  );
});

test("reports missing required server-side env vars", async () => {
  const report = await buildSupabaseReadinessReport({
    env: {
      SUPABASE_URL: "https://example.supabase.co"
    },
    connect: false
  });

  assert.equal(report.ok, false);
  assert.deepEqual(report.missing, [
    "SUPABASE_SERVICE_ROLE_KEY",
    "AI_RADAR_API_TOKEN"
  ]);
  assert.equal(report.secretValuesPrinted, false);
});

test("checks expected tables through an injected client", async () => {
  const report = await buildSupabaseReadinessReport({
    env: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret-value",
      AI_RADAR_API_TOKEN: "local-token"
    },
    supabaseClient: {
      from(tableName) {
        return {
          select() {
            assert.match(tableName, /daily_runs|signals|signal_sources|source_catalog/);
            return {
              limit: async () => ({ data: [], error: null })
            };
          }
        };
      }
    }
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.tablesChecked, [
    "daily_runs",
    "signals",
    "signal_sources",
    "source_catalog"
  ]);
});

#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AI_RADAR_API_TOKEN"
];

const EXPECTED_TABLES = [
  "daily_runs",
  "signals",
  "signal_sources",
  "source_catalog"
];

const PLACEHOLDER_VALUES = new Set([
  "",
  "replace-with-service-role-key",
  "replace-with-local-dev-token",
  "replace-with-anon-key",
  "replace-with-password"
]);

function parseDotEnv(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1).trim());
    env[key] = value;
  }
  return env;
}

async function buildSupabaseReadinessReport(options = {}) {
  const env = options.env || loadEnv(options.envPath);
  const missing = REQUIRED_ENV.filter((name) => isMissingEnvValue(env[name]));
  const report = {
    ok: missing.length === 0,
    missing,
    projectUrlConfigured: Boolean(env.SUPABASE_URL),
    tablesChecked: [],
    tableErrors: [],
    secretValuesPrinted: false
  };

  if (missing.length > 0 || options.connect === false) {
    return report;
  }

  const supabase = options.supabaseClient || createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  for (const tableName of EXPECTED_TABLES) {
    const { error } = await supabase
      .from(tableName)
      .select("*")
      .limit(1);
    if (error) {
      report.ok = false;
      report.tableErrors.push({ table: tableName, message: error.message });
    } else {
      report.tablesChecked.push(tableName);
    }
  }

  return report;
}

function loadEnv(envPath = ".env") {
  const resolvedPath = path.resolve(envPath);
  if (!fs.existsSync(resolvedPath)) {
    return {};
  }
  return parseDotEnv(fs.readFileSync(resolvedPath, "utf8"));
}

function isMissingEnvValue(value) {
  return !value || PLACEHOLDER_VALUES.has(value);
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

async function main(argv) {
  const envPath = argv[2] || ".env";
  const report = await buildSupabaseReadinessReport({ envPath });

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    return 1;
  }
  return 0;
}

if (require.main === module) {
  main(process.argv)
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  buildSupabaseReadinessReport,
  parseDotEnv
};

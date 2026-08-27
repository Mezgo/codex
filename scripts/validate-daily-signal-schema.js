#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { DailySignalValidationError, validateDailySignals } = require("../src/server/daily-signal-schema");

function main(argv) {
  const files = argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: node scripts/validate-daily-signal-schema.js <daily-signals.json> [...]");
    return 1;
  }

  for (const file of files) {
    const absolutePath = path.resolve(file);
    try {
      const payload = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
      validateDailySignals(payload);
      console.log(`OK ${file}`);
    } catch (error) {
      console.error(`Invalid ${file}`);
      if (error instanceof DailySignalValidationError) {
        console.error(JSON.stringify(error.errors, null, 2));
      } else {
        console.error(error.message);
      }
      return 1;
    }
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv);
}

module.exports = { main };

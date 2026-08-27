const {
  DailySignalValidationError,
  validateDailySignals
} = require("../src/server/daily-signal-schema");
const repository = require("../src/server/signal-repository");

async function handleDailySignalsRequest(req, res, options = {}) {
  const env = options.env || process.env;
  const repo = options.repository || repository;

  if (!isAuthorized(req, env)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  try {
    if (req.method === "POST") {
      const payload = await readJsonBody(req);
      validateDailySignals(payload);
      const result = await repo.saveDailySignals(payload, {
        env,
        supabaseClient: options.supabaseClient
      });
      return sendJson(res, 200, result);
    }

    if (req.method === "GET") {
      const url = parseRequestUrl(req);
      const result = await repo.queryDailySignals(
        {
          day: url.searchParams.get("day"),
          limit: url.searchParams.get("limit") || "5",
          order: url.searchParams.get("order") || "impact-desc"
        },
        {
          env,
          supabaseClient: options.supabaseClient
        }
      );
      return sendJson(res, 200, result);
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    if (error instanceof DailySignalValidationError) {
      return sendJson(res, 400, {
        error: "Invalid AI Radar daily signals payload",
        details: error.errors
      });
    }
    return sendJson(res, 500, { error: error.message });
  }
}

function isAuthorized(req, env = process.env) {
  const token = env.AI_RADAR_API_TOKEN;
  if (!token) {
    return false;
  }
  const header = req.headers?.authorization || req.headers?.Authorization;
  return header === `Bearer ${token}`;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function parseRequestUrl(req) {
  return new URL(req.url || "/api/daily-signals", "http://localhost");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

module.exports = handleDailySignalsRequest;
module.exports.handleDailySignalsRequest = handleDailySignalsRequest;
module.exports.isAuthorized = isAuthorized;

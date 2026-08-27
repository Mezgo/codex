const test = require("node:test");
const assert = require("node:assert/strict");

const {
  handleDailySignalsRequest,
  isAuthorized
} = require("../../api/daily-signals");

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    }
  };
}

const validPayload = {
  schemaVersion: "1.0.0",
  kind: "ai-radar.daily-signals",
  generatedAt: "2026-08-26T15:00:00Z",
  query: {
    date: "2026-08-26",
    prompt: "Noticias de hoy",
    language: "es",
    topics: ["agents"]
  },
  signals: [
    {
      id: "2026-08-26-openai-news",
      title: "OpenAI publica una actualizacion",
      source: {
        name: "OpenAI News",
        url: "https://openai.com/news/example",
        publishedAt: "2026-08-26"
      },
      evidence: "Comunicado oficial.",
      impact: {
        level: "high",
        summary: "Afecta builders que usan APIs."
      },
      action: "Revisar cambios de producto.",
      status: "monitor",
      tags: ["api"]
    }
  ]
};

test("requires bearer authorization for writes", () => {
  assert.equal(
    isAuthorized({ headers: {} }, { AI_RADAR_API_TOKEN: "secret" }),
    false
  );
});

test("rejects missing authorization", async () => {
  const res = createResponse();

  await handleDailySignalsRequest(
    { method: "POST", headers: {}, body: validPayload },
    res,
    { env: { AI_RADAR_API_TOKEN: "secret" }, repository: {} }
  );

  assert.equal(res.statusCode, 401);
});

test("rejects invalid payloads before repository writes", async () => {
  const res = createResponse();
  let called = false;

  await handleDailySignalsRequest(
    {
      method: "POST",
      headers: { authorization: "Bearer secret" },
      body: { signals: [] }
    },
    res,
    {
      env: { AI_RADAR_API_TOKEN: "secret" },
      repository: {
        saveDailySignals: async () => {
          called = true;
        }
      }
    }
  );

  assert.equal(res.statusCode, 400);
  assert.equal(called, false);
});

test("posts daily signals through the injected repository", async () => {
  const res = createResponse();

  await handleDailySignalsRequest(
    {
      method: "POST",
      headers: { authorization: "Bearer secret" },
      body: validPayload
    },
    res,
    {
      env: { AI_RADAR_API_TOKEN: "secret" },
      repository: {
        saveDailySignals: async (payload) => {
          assert.equal(payload.query.date, "2026-08-26");
          return {
            runId: "run-1",
            signalsInserted: 1,
            signalsUpdated: 0,
            sourcesInserted: 0
          };
        }
      }
    }
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), {
    runId: "run-1",
    signalsInserted: 1,
    signalsUpdated: 0,
    sourcesInserted: 0
  });
});

test("gets daily signals through the injected repository", async () => {
  const res = createResponse();

  await handleDailySignalsRequest(
    {
      method: "GET",
      headers: { authorization: "Bearer secret" },
      url: "/api/daily-signals?day=2026-08-26&limit=1&order=impact-desc"
    },
    res,
    {
      env: { AI_RADAR_API_TOKEN: "secret" },
      repository: {
        queryDailySignals: async (params) => {
          assert.deepEqual(params, {
            day: "2026-08-26",
            limit: "1",
            order: "impact-desc"
          });
          return {
            day: "2026-08-26",
            order: "impact-desc",
            limit: 1,
            count: 0,
            signals: []
          };
        }
      }
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).day, "2026-08-26");
});

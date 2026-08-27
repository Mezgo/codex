const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildQueryResponse,
  mapDailyRunRow,
  mapSignalRow,
  mapSignalSourceRows
} = require("../../src/server/signal-repository");

const dailyPayload = {
  schemaVersion: "1.0.0",
  kind: "ai-radar.daily-signals",
  generatedAt: "2026-08-26T15:00:00Z",
  query: {
    date: "2026-08-26",
    prompt: "Noticias de hoy",
    language: "es",
    topics: ["agents", "open-source"]
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
      tags: ["api"],
      corroboratingSources: [
        {
          name: "The Decoder",
          url: "https://the-decoder.com/example",
          type: "secondary",
          publishedAt: "2026-08-26",
          note: "Resume el anuncio."
        }
      ]
    }
  ]
};

test("maps the daily JSON query into a daily_runs row", () => {
  assert.deepEqual(mapDailyRunRow(dailyPayload), {
    run_date: "2026-08-26",
    prompt: "Noticias de hoy",
    language: "es",
    topics: ["agents", "open-source"],
    generated_at: "2026-08-26T15:00:00Z",
    source_mode: "manual"
  });
});

test("maps a daily signal into a normalized signals row", () => {
  const row = mapSignalRow("run-1", dailyPayload.signals[0]);

  assert.equal(row.id, "2026-08-26-openai-news");
  assert.equal(row.run_id, "run-1");
  assert.equal(row.title, "OpenAI publica una actualizacion");
  assert.equal(row.source_name, "OpenAI News");
  assert.equal(row.source_url, "https://openai.com/news/example");
  assert.equal(row.published_at, "2026-08-26");
  assert.equal(row.impact_level, "high");
  assert.deepEqual(row.tags, ["api"]);
  assert.deepEqual(row.payload, dailyPayload.signals[0]);
});

test("maps corroboratingSources into signal_sources rows", () => {
  assert.deepEqual(mapSignalSourceRows(dailyPayload.signals[0]), [
    {
      signal_id: "2026-08-26-openai-news",
      name: "The Decoder",
      url: "https://the-decoder.com/example",
      source_type: "secondary",
      published_at: "2026-08-26",
      note: "Resume el anuncio."
    }
  ]);
});

test("builds a query response compatible with the fixture reader", () => {
  const response = buildQueryResponse({
    run: { run_date: "2026-08-26", prompt: "Noticias de hoy", language: "es", topics: [] },
    signals: [
      {
        id: "low",
        impact_level: "low",
        published_at: "2026-08-26",
        payload: { id: "low", impact: { level: "low" } }
      },
      {
        id: "high",
        impact_level: "high",
        published_at: "2026-08-26",
        payload: { id: "high", impact: { level: "high" } }
      }
    ],
    limit: 1,
    order: "impact-desc"
  });

  assert.equal(response.query.date, "2026-08-26");
  assert.equal(response.day, "2026-08-26");
  assert.equal(response.count, 1);
  assert.deepEqual(response.signals, [{ id: "high", impact: { level: "high" } }]);
});

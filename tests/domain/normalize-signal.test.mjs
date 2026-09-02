import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSignal, normalizeSignals } from "../../src/domain/normalize-signal.mjs";

const completeSignal = {
  id: "signal-1",
  title: "Agente verificable",
  source: { name: "Fuente primaria", url: "https://example.com", publishedAt: "2026-08-04" },
  evidence: "Existe una demostración reproducible.",
  impact: { level: "high", summary: "Reduce trabajo manual." },
  action: "Probar con un flujo pequeño.",
  status: "active",
  tags: ["agents", "evaluation"],
  primarySourceValidation: { status: "passed" },
  hypothesis: { decision: "probar ahora", confidence: "medium" },
  hypeAssessment: { score: 8, recommendation: "probar" }
};

test("normalizeSignal deriva puntuaciones reproducibles sin inventar hechos", () => {
  const result = normalizeSignal(completeSignal, 0);
  assert.equal(result.id, "signal-1");
  assert.equal(result.sourceName, "Fuente primaria");
  assert.equal(result.statusLabel, "Señal fuerte");
  assert.equal(result.scores.evidence, 100);
  assert.equal(result.scores.impact, 90);
  assert.ok(result.compositeScore >= 0 && result.compositeScore <= 100);
  assert.equal(result.trend.length, 8);
});

test("normalizeSignal marca campos ausentes como Sin dato", () => {
  const result = normalizeSignal({ id: "partial", title: "Parcial" }, 1);
  assert.equal(result.sourceName, "Sin dato");
  assert.equal(result.publishedAt, "Sin dato");
  assert.equal(result.statusLabel, "Datos parciales");
  assert.match(result.searchText, /parcial/i);
});

test("normalizeSignals rechaza un payload sin arreglo de señales", () => {
  assert.throws(() => normalizeSignals({}), /arreglo signals/i);
});

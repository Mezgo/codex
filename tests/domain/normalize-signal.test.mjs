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
  assert.equal(result.statusLabel, "Activa");
  assert.equal(result.validationLabel, "Validación aprobada");
  assert.equal(result.hypeRecommendationLabel, "Probar");
  assert.equal(result.scores.evidence, 100);
  assert.equal(result.scores.impact, 90);
  assert.ok(result.compositeScore >= 0 && result.compositeScore <= 100);
  assert.equal(result.trend.length, 8);
  assert.equal(result.evidence, completeSignal.evidence);
  assert.equal(result.impactSummary, completeSignal.impact.summary);
  assert.equal(result.action, completeSignal.action);
});

test("normalizeSignal marca campos ausentes como Sin dato", () => {
  const result = normalizeSignal({ id: "partial", title: "Parcial" }, 1);
  assert.equal(result.sourceName, "Sin dato");
  assert.equal(result.publishedAt, "Sin dato");
  assert.equal(result.statusLabel, "Sin dato");
  assert.equal(result.validationLabel, "Sin dato");
  assert.equal(result.hypeRecommendationLabel, "Sin dato");
  assert.deepEqual(result.scores, {
    novelty: null,
    impact: null,
    evidence: null,
    actionability: null
  });
  assert.equal(result.compositeScore, null);
  assert.equal(result.trend, null);
  assert.equal(result.evidence, "Sin dato");
  assert.equal(result.impactSummary, "Sin dato");
  assert.equal(result.action, "Sin dato");
  assert.equal(result.duplicateCount, 0);
  assert.match(result.searchText, /parcial/i);
});

test("normalizeSignal conserva monitor y la recomendación ignorar por ahora", () => {
  const result = normalizeSignal({
    ...completeSignal,
    id: "monitor-ignore",
    status: "monitor",
    hypeAssessment: { score: 3, recommendation: "ignorar por ahora" }
  });

  assert.equal(result.status, "monitor");
  assert.equal(result.statusLabel, "Monitorear");
  assert.equal(result.hypeRecommendation, "ignorar por ahora");
  assert.equal(result.hypeRecommendationLabel, "Ignorar por ahora");
  assert.notEqual(result.statusLabel, "Señal fuerte");
});

test("normalizeSignal presenta investigating como estado operativo", () => {
  const result = normalizeSignal({ ...completeSignal, status: "investigating" });

  assert.equal(result.status, "investigating");
  assert.equal(result.statusLabel, "Investigando");
});

test("normalizeSignal conserva una advertencia de validación primaria", () => {
  const result = normalizeSignal({
    ...completeSignal,
    primarySourceValidation: { status: "warning" }
  });

  assert.equal(result.validationStatus, "warning");
  assert.equal(result.validationLabel, "Validación con advertencia");
  assert.equal(result.scores.evidence, 60);
});

test("normalizeSignals rechaza un payload sin arreglo de señales", () => {
  assert.throws(() => normalizeSignals({}), /arreglo signals/i);
});

test("normalizeSignals cuenta duplicados por título normalizado", () => {
  const signals = normalizeSignals({
    signals: [
      { id: "a", title: "Ágente: verificable", source: { url: "https://example.com/a" } },
      { id: "b", title: "agente verificable", source: { url: "https://example.com/b" } }
    ]
  });

  assert.deepEqual(signals.map(({ duplicateCount }) => duplicateCount), [1, 1]);
});

test("normalizeSignals cuenta duplicados por URL canónica", () => {
  const signals = normalizeSignals({
    signals: [
      { id: "a", title: "Primera", source: { url: "https://EXAMPLE.com/ruta/?utm_source=radar#detalle" } },
      { id: "b", title: "Segunda", source: { url: "https://example.com/ruta" } }
    ]
  });

  assert.deepEqual(signals.map(({ duplicateCount }) => duplicateCount), [1, 1]);
});

test("normalizeSignals no cuenta la propia señal ni elementos distintos", () => {
  const signals = normalizeSignals({
    signals: [
      { id: "a", title: "Primera", source: { url: "https://example.com/a" } },
      { id: "b", title: "Segunda", source: { url: "https://example.com/b" } }
    ]
  });

  assert.deepEqual(signals.map(({ duplicateCount }) => duplicateCount), [0, 0]);
});

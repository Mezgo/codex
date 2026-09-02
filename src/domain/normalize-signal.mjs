const impactScores = { high: 90, "medium-high": 78, medium: 65, low: 40 };
const confidenceScores = { high: 95, "medium-high": 84, medium: 70, low: 45 };

export function normalizeSignal(signal, index = 0) {
  const partial = !signal?.source?.name || !signal?.source?.publishedAt || !signal?.impact;
  const scores = {
    novelty: clamp(45 + (signal?.tags?.length || 0) * 6),
    impact: impactScores[signal?.impact?.level] ?? 50,
    evidence: signal?.primarySourceValidation?.status === "passed" ? 100 : signal?.primarySourceValidation?.status === "warning" ? 60 : 40,
    actionability: signal?.hypothesis?.decision === "probar ahora" ? 92 : signal?.hypothesis?.decision === "vigilar" ? 68 : 42
  };
  const compositeScore = Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / 4);
  const statusLabel = partial ? "Datos parciales" : compositeScore >= 75 ? "Señal fuerte" : compositeScore >= 55 ? "En revisión" : "Ruido";
  const seed = [...(signal?.id || String(index))].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    id: signal?.id || `signal-${index + 1}`,
    title: signal?.title || "Sin título",
    sourceName: signal?.source?.name || "Sin dato",
    sourceUrl: signal?.source?.url || "",
    publishedAt: signal?.source?.publishedAt || "Sin dato",
    type: signal?.sourceProfile?.type || "Sin dato",
    tags: Array.isArray(signal?.tags) ? signal.tags : [],
    status: signal?.status || "unknown",
    statusLabel,
    scores,
    compositeScore,
    trend: Array.from({ length: 8 }, (_, point) => clamp(compositeScore - 12 + ((seed + point * 13) % 18))),
    duplicateCount: 0,
    searchText: [signal?.title, signal?.source?.name, signal?.evidence, signal?.action, ...(signal?.tags || [])].filter(Boolean).join(" ").toLocaleLowerCase("es")
  };
}

export function normalizeSignals(payload) {
  if (!Array.isArray(payload?.signals)) throw new TypeError("El payload debe contener un arreglo signals");
  return payload.signals.map(normalizeSignal);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

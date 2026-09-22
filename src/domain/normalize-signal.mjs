import { sourceCategory } from "./source-category.mjs";

const impactScores = { high: 90, "medium-high": 78, medium: 65, low: 40 };
const evidenceScores = { passed: 100, warning: 60, failed: 20 };
const actionabilityScores = { "probar ahora": 92, vigilar: 68, "ignorar por ahora": 25, descartar: 20 };
const statusLabels = {
  active: "Activa",
  investigating: "Investigando",
  monitor: "Monitorear",
  "open-opportunity": "Oportunidad abierta"
};
const validationLabels = {
  passed: "Validación aprobada",
  warning: "Validación con advertencia",
  failed: "Validación fallida"
};
const hypeRecommendationLabels = {
  probar: "Probar",
  vigilar: "Vigilar",
  "ignorar por ahora": "Ignorar por ahora",
  descartar: "Descartar"
};

export function normalizeSignal(signal, index = 0) {
  const tags = Array.isArray(signal?.tags) ? signal.tags : [];
  const status = textValue(signal?.status) || "unknown";
  const validationStatus = textValue(signal?.primarySourceValidation?.status) || "unknown";
  const hypeRecommendation = textValue(signal?.hypeAssessment?.recommendation) || "unknown";
  const scores = {
    novelty: Array.isArray(signal?.tags) ? clamp(45 + tags.length * 6) : null,
    impact: impactScores[signal?.impact?.level] ?? null,
    evidence: evidenceScores[validationStatus] ?? null,
    actionability: actionabilityScores[signal?.hypothesis?.decision] ?? null
  };
  const scoreValues = Object.values(scores);
  const compositeScore = scoreValues.every(Number.isFinite)
    ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)
    : null;
  const seed = [...(signal?.id || String(index))].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const evidence = displayText(signal?.evidence);
  const impactSummary = displayText(signal?.impact?.summary);
  const action = displayText(signal?.action);
  return {
    id: signal?.id || `signal-${index + 1}`,
    title: signal?.title || "Sin título",
    sourceName: signal?.source?.name || "Sin dato",
    sourceCategory: sourceCategory(signal?.sourceProfile?.type),
    sourceUrl: signal?.source?.url || "",
    publishedAt: signal?.source?.publishedAt || "Sin dato",
    type: signal?.sourceProfile?.type || "Sin dato",
    tags,
    status,
    statusLabel: statusLabels[status] || "Sin dato",
    validationStatus,
    validationLabel: validationLabels[validationStatus] || "Sin dato",
    hypeRecommendation,
    hypeRecommendationLabel: hypeRecommendationLabels[hypeRecommendation] || "Sin dato",
    evidence,
    impactSummary,
    action,
    scores,
    compositeScore,
    trend: compositeScore === null
      ? null
      : Array.from({ length: 8 }, (_, point) => clamp(compositeScore - 12 + ((seed + point * 13) % 18))),
    duplicateCount: 0,
    searchText: [
      signal?.title,
      signal?.source?.name,
      evidence,
      impactSummary,
      action,
      statusLabels[status],
      validationLabels[validationStatus],
      hypeRecommendationLabels[hypeRecommendation],
      ...tags
    ].filter(Boolean).join(" ").toLocaleLowerCase("es")
  };
}

export function normalizeSignals(payload) {
  if (!Array.isArray(payload?.signals)) throw new TypeError("El payload debe contener un arreglo signals");
  const signals = payload.signals.map((signal, index) => normalizeSignal(signal, index));
  const duplicateKeys = payload.signals.map((signal) => ({
    title: canonicalTitle(signal?.title),
    url: canonicalUrl(signal?.source?.url)
  }));

  return signals.map((signal, index) => ({
    ...signal,
    duplicateCount: duplicateKeys.reduce((count, candidate, candidateIndex) => {
      if (candidateIndex === index) return count;
      const sameTitle = duplicateKeys[index].title && duplicateKeys[index].title === candidate.title;
      const sameUrl = duplicateKeys[index].url && duplicateKeys[index].url === candidate.url;
      return count + (sameTitle || sameUrl ? 1 : 0);
    }, 0)
  }));
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function textValue(value) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("es") : "";
}

function displayText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "Sin dato";
}

function canonicalTitle(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function canonicalUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.href;
  } catch {
    return "";
  }
}

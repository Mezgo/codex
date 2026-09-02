export function serializeVisibleSignals(signals) {
  return JSON.stringify(
    signals.map(({ id, title, compositeScore, sourceName, sourceUrl }) => ({
      id,
      title,
      score: compositeScore,
      source: sourceName,
      url: sourceUrl
    })),
    null,
    2
  );
}

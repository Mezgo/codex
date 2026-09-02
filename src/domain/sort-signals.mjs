export function sortSignals(signals, key = "composite", direction = "desc") {
  const multiplier = direction === "asc" ? 1 : -1;
  const valueFor = (signal) => key === "composite" ? signal.compositeScore : signal.scores[key] ?? 0;
  return signals.map((signal, index) => ({ signal, index })).sort((left, right) => (valueFor(left.signal) - valueFor(right.signal)) * multiplier || left.index - right.index).map(({ signal }) => signal);
}

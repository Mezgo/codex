export function sortSignals(signals, key = "composite", direction = "desc") {
  const multiplier = direction === "asc" ? 1 : -1;
  const valueFor = (signal) => key === "composite" ? signal.compositeScore : signal.scores[key];
  return signals
    .map((signal, index) => ({ signal, index }))
    .sort((left, right) => {
      const leftValue = valueFor(left.signal);
      const rightValue = valueFor(right.signal);
      const leftMissing = !Number.isFinite(leftValue);
      const rightMissing = !Number.isFinite(rightValue);
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      if (leftMissing) return left.index - right.index;
      return (leftValue - rightValue) * multiplier || left.index - right.index;
    })
    .map(({ signal }) => signal);
}

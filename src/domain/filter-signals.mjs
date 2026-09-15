export function filterSignals(signals, { query = "", source = "all", days = "all", now = new Date("2026-08-05T00:00:00Z") } = {}) {
  const needle = query.trim().toLocaleLowerCase("es");
  const earliest = days === "all" ? null : new Date(now.getTime() - Number(days) * 86400000);
  return signals.filter((signal) => {
    const matchesQuery = !needle || signal.searchText.includes(needle);
    const matchesSource = source === "all" || signal.sourceName === source;
    const published = signal.publishedAt === "Sin dato" ? null : new Date(`${signal.publishedAt}T00:00:00Z`);
    const matchesDate = !earliest || (published && published >= earliest);
    return matchesQuery && matchesSource && matchesDate;
  });
}

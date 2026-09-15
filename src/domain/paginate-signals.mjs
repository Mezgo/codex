export function paginateSignals(signals, requestedPage = 1, pageSize = 7) {
  const totalPages = Math.max(1, Math.ceil(signals.length / pageSize));
  const page = Math.max(1, Math.min(Number(requestedPage) || 1, totalPages));
  const start = (page - 1) * pageSize;
  return { items: signals.slice(start, start + pageSize), page, pageSize, total: signals.length, totalPages };
}

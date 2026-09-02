import test from "node:test";
import assert from "node:assert/strict";
import { filterSignals } from "../../src/domain/filter-signals.mjs";
import { sortSignals } from "../../src/domain/sort-signals.mjs";
import { paginateSignals } from "../../src/domain/paginate-signals.mjs";

const signals = [
  { id: "a", sourceName: "OpenAI", publishedAt: "2026-08-04", searchText: "agentes seguridad", compositeScore: 82, scores: { evidence: 90 } },
  { id: "b", sourceName: "GitHub", publishedAt: "2026-07-25", searchText: "modelo local", compositeScore: 58, scores: { evidence: 45 } },
  { id: "c", sourceName: "OpenAI", publishedAt: "Sin dato", searchText: "agente educativo", compositeScore: 70, scores: { evidence: 75 } }
];

test("filterSignals combina búsqueda y fuente", () => {
  assert.deepEqual(filterSignals(signals, { query: "agente", source: "OpenAI", days: "all" }).map(({ id }) => id), ["a", "c"]);
});

test("sortSignals mantiene estable el orden cuando empatan", () => {
  const tied = signals.map((signal) => ({ ...signal, compositeScore: 70 }));
  assert.deepEqual(sortSignals(tied, "composite", "desc").map(({ id }) => id), ["a", "b", "c"]);
});

test("paginateSignals limita página fuera de rango", () => {
  const result = paginateSignals(signals, 9, 2);
  assert.equal(result.page, 2);
  assert.deepEqual(result.items.map(({ id }) => id), ["c"]);
  assert.equal(result.totalPages, 2);
});

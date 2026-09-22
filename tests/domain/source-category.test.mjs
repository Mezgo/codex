import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSignals } from "../../src/domain/normalize-signal.mjs";
import { filterSignals } from "../../src/domain/filter-signals.mjs";
import { sourceCategoryLabel } from "../../src/domain/source-category.mjs";

test("agrupa fuentes diferentes por categoría y combina texto y fecha", () => {
  const signals = normalizeSignals({ signals: [
    { id: "a", title: "Agentes", source: { name: "Uno", publishedAt: "2026-08-04" }, sourceProfile: { type: "official" } },
    { id: "b", title: "Modelos", source: { name: "Dos", publishedAt: "2026-07-01" }, sourceProfile: { type: "official" } },
    { id: "c", title: "Agentes", sourceProfile: { type: "secondary-media" } },
    { id: "d", sourceProfile: { type: "unexpected" } },
    { id: "e" }
  ] });
  const ids = (filters) => filterSignals(signals, filters).map(({ id }) => id);
  assert.deepEqual(ids({ sourceCategory: "official" }), ["a", "b"]);
  assert.deepEqual(ids({ sourceCategory: "official", query: "agentes", days: "7" }), ["a"]);
  assert.deepEqual(ids({ sourceCategory: "official", query: "inexistente" }), []);
  assert.deepEqual(ids({ sourceCategory: "unknown" }), ["d", "e"]);
  assert.equal(ids({ sourceCategory: "all" }).length, 5);
  assert.equal(sourceCategoryLabel("official"), "Oficial");
  assert.equal(sourceCategoryLabel("secondary-media"), "Noticias");
  assert.equal(sourceCategoryLabel("unknown"), "Sin categoría");
});

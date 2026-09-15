import test from "node:test";
import assert from "node:assert/strict";
import { serializeVisibleSignals } from "../../src/domain/export-signals.mjs";

test("serializeVisibleSignals exporta solo campos publicos visibles", () => {
  const json = serializeVisibleSignals([
    {
      id: "a",
      title: "Señal",
      compositeScore: 80,
      sourceName: "Fuente",
      sourceUrl: "https://example.com",
      searchText: "detalle interno"
    }
  ]);

  assert.deepEqual(JSON.parse(json), [
    {
      id: "a",
      title: "Señal",
      score: 80,
      source: "Fuente",
      url: "https://example.com"
    }
  ]);
});

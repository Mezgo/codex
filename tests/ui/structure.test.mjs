import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("index contiene controles etiquetados y regiones de estado", () => {
  const html = fs.readFileSync(new URL("../../src/index.html", import.meta.url), "utf8");
  const requiredFragments = [
    "<main",
    "aria-live=\"polite\"",
    "for=\"search-input\"",
    "id=\"app-status\"",
    "id=\"search-input\"",
    "id=\"date-filter\"",
    "id=\"source-filter\"",
    "id=\"sort-key\"",
    "id=\"sort-direction\"",
    "id=\"mode-reader\"",
    "id=\"mode-operator\"",
    "id=\"export-button\"",
    "id=\"signals-container\"",
    "id=\"result-summary\"",
    "id=\"pagination\"",
    "id=\"clear-filters\"",
    "type=\"module\""
  ];

  for (const fragment of requiredFragments) {
    assert.ok(html.includes(fragment), fragment);
  }
});

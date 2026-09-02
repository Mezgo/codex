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

test("el selector de modo se agrupa para tecnologías de asistencia", () => {
  const html = fs.readFileSync(new URL("../../src/index.html", import.meta.url), "utf8");

  assert.match(html, /class="mode-switch" role="group" aria-label="Modo de visualización"/);
});

test("las superficies azules usan texto oscuro legible", () => {
  const css = fs.readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

  assert.match(css, /--on-blue:\s*#04101d;/);
  assert.match(css, /\.mode-button\.is-selected,[\s\S]*?color:\s*var\(--on-blue\);/);
  assert.match(css, /\.button-primary\s*\{[\s\S]*?color:\s*var\(--on-blue\);/);
});

test("la marca ofrece un objetivo táctil de 44 píxeles", () => {
  const css = fs.readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

  assert.match(css, /\.brand\s*\{[\s\S]*?min-height:\s*44px;/);
});

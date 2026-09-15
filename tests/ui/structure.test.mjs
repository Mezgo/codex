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

test("los bordes de controles alcanzan contraste no textual de 3 a 1", () => {
  const css = fs.readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
  const controlBorder = customProperty(css, "control-border");
  const surface = customProperty(css, "surface");
  const surfaceStrong = customProperty(css, "surface-strong");
  const blue = customProperty(css, "blue");
  const onBlue = customProperty(css, "on-blue");

  assert.ok(contrastRatio(controlBorder, surface) >= 3, "input/select border against surface");
  assert.ok(contrastRatio(controlBorder, surfaceStrong) >= 3, "button border against surface");
  assert.ok(contrastRatio(onBlue, blue) >= 3, "selected/primary button border against blue");
  assert.match(css, /input,\s*select\s*\{[\s\S]*?border:\s*1px solid var\(--control-border\);/);
  assert.match(css, /\.button,\s*\.pagination-button\s*\{[\s\S]*?border:\s*1px solid var\(--control-border\);/);
  assert.match(css, /\.mode-button\s*\{[\s\S]*?border:\s*1px solid var\(--control-border\);/);
});

function customProperty(css, name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i"));
  assert.ok(match, `--${name}`);
  return match[1];
}

function contrastRatio(left, right) {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  return (Math.max(leftLuminance, rightLuminance) + 0.05) / (Math.min(leftLuminance, rightLuminance) + 0.05);
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

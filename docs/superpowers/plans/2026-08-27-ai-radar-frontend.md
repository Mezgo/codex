# AI Radar Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un dashboard responsive y accesible de AI Radar que reproduzca la referencia visual y explore los fixtures locales existentes con interacciones reales.

**Architecture:** El navegador cargará el fixture declarado mediante un adaptador ES module, lo normalizará con funciones puras de dominio y renderizará una tabla en escritorio y tarjetas en móvil desde un único estado de aplicación. Un servidor Node mínimo expondrá archivos locales; Playwright verificará el comportamiento, la consola y las capturas sin introducir un framework de frontend.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, Node.js, `node:test`, Playwright con Chromium.

**Spec:** `docs/superpowers/specs/2026-08-27-ai-radar-frontend-design.md`

## Global Constraints

- Usar únicamente HTML, CSS y JavaScript planos para la interfaz.
- Cargar `data/fixtures/daily-signals/2026-08-04.json` y mostrar que es una demo con fixture local.
- No exponer `AI_RADAR_API_TOKEN` ni afirmar conexión activa con Supabase.
- Implementar carga, éxito, vacío, error y tolerancia a datos parciales.
- Verificar `390x844` y `1440x900` sin desbordamiento horizontal.
- Mantener teclado, foco visible, semántica, nombres accesibles, contraste y texto junto al color.
- Entregar consola y red sin fallos inesperados y capturas finales en `snapshots/`.
- Conservar módulos pequeños, indentación de 2 espacios, `camelCase` y pruebas de dominio con `node:test`.

---

## Mapa de archivos

- `src/index.html`: estructura semántica y regiones de la aplicación.
- `src/styles.css`: tokens visuales, tabla de escritorio, tarjetas móviles y estados.
- `src/app.mjs`: estado, eventos, renderizado y exportación.
- `src/data/load-signals.mjs`: carga del fixture y error normalizado.
- `src/domain/normalize-signal.mjs`: modelo de presentación y puntuaciones derivadas.
- `src/domain/filter-signals.mjs`: búsqueda y filtros.
- `src/domain/sort-signals.mjs`: orden estable.
- `src/domain/paginate-signals.mjs`: páginas y límites.
- `scripts/serve-frontend.js`: servidor estático local con Node.
- `tests/domain/*.test.mjs`: pruebas unitarias de dominio.
- `tests/ui/ai-radar.spec.js`: pruebas de navegador y capturas.
- `playwright.config.js`: servidor, navegador y viewports de QA.
- `package.json`: comandos de desarrollo y QA.

### Task 1: Normalización y ranking determinista

**Files:**
- Create: `src/domain/normalize-signal.mjs`
- Create: `tests/domain/normalize-signal.test.mjs`

**Interfaces:**
- Consumes: objetos `signal` del contrato `ai-radar.daily-signals`.
- Produces: `normalizeSignal(signal, index)` y `normalizeSignals(payload)`; cada resultado contiene `id`, `title`, `sourceName`, `sourceUrl`, `publishedAt`, `type`, `tags`, `status`, `statusLabel`, `scores`, `compositeScore`, `trend`, `duplicateCount` y `searchText`.

- [ ] **Step 1: Escribir pruebas que fallen para campos completos y parciales**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSignal, normalizeSignals } from "../../src/domain/normalize-signal.mjs";

const completeSignal = {
  id: "signal-1",
  title: "Agente verificable",
  source: { name: "Fuente primaria", url: "https://example.com", publishedAt: "2026-08-04" },
  evidence: "Existe una demostración reproducible.",
  impact: { level: "high", summary: "Reduce trabajo manual." },
  action: "Probar con un flujo pequeño.",
  status: "active",
  tags: ["agents", "evaluation"],
  primarySourceValidation: { status: "passed" },
  hypothesis: { decision: "probar ahora", confidence: "medium" },
  hypeAssessment: { score: 8, recommendation: "probar" }
};

test("normalizeSignal deriva puntuaciones reproducibles sin inventar hechos", () => {
  const result = normalizeSignal(completeSignal, 0);
  assert.equal(result.id, "signal-1");
  assert.equal(result.sourceName, "Fuente primaria");
  assert.equal(result.statusLabel, "Señal fuerte");
  assert.equal(result.scores.evidence, 100);
  assert.equal(result.scores.impact, 90);
  assert.ok(result.compositeScore >= 0 && result.compositeScore <= 100);
  assert.equal(result.trend.length, 8);
});

test("normalizeSignal marca campos ausentes como Sin dato", () => {
  const result = normalizeSignal({ id: "partial", title: "Parcial" }, 1);
  assert.equal(result.sourceName, "Sin dato");
  assert.equal(result.publishedAt, "Sin dato");
  assert.equal(result.statusLabel, "Datos parciales");
  assert.match(result.searchText, /parcial/i);
});

test("normalizeSignals rechaza un payload sin arreglo de señales", () => {
  assert.throws(() => normalizeSignals({}), /arreglo signals/i);
});
```

- [ ] **Step 2: Ejecutar la prueba y confirmar el fallo esperado**

Run: `node --test tests/domain/normalize-signal.test.mjs`

Expected: FAIL con `ERR_MODULE_NOT_FOUND` para `normalize-signal.mjs`.

- [ ] **Step 3: Implementar normalización y puntuaciones mínimas**

```js
const impactScores = { high: 90, "medium-high": 78, medium: 65, low: 40 };
const confidenceScores = { high: 95, "medium-high": 84, medium: 70, low: 45 };

export function normalizeSignal(signal, index = 0) {
  const partial = !signal?.source?.name || !signal?.source?.publishedAt || !signal?.impact;
  const scores = {
    novelty: clamp(45 + (signal?.tags?.length || 0) * 6),
    impact: impactScores[signal?.impact?.level] ?? 50,
    evidence: signal?.primarySourceValidation?.status === "passed" ? 100 : signal?.primarySourceValidation?.status === "warning" ? 60 : 40,
    actionability: signal?.hypothesis?.decision === "probar ahora" ? 92 : signal?.hypothesis?.decision === "vigilar" ? 68 : 42
  };
  const compositeScore = Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / 4);
  const statusLabel = partial ? "Datos parciales" : compositeScore >= 75 ? "Señal fuerte" : compositeScore >= 55 ? "En revisión" : "Ruido";
  const seed = [...(signal?.id || String(index))].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    id: signal?.id || `signal-${index + 1}`,
    title: signal?.title || "Sin título",
    sourceName: signal?.source?.name || "Sin dato",
    sourceUrl: signal?.source?.url || "",
    publishedAt: signal?.source?.publishedAt || "Sin dato",
    type: signal?.sourceProfile?.type || "Sin dato",
    tags: Array.isArray(signal?.tags) ? signal.tags : [],
    status: signal?.status || "unknown",
    statusLabel,
    scores,
    compositeScore,
    trend: Array.from({ length: 8 }, (_, point) => clamp(compositeScore - 12 + ((seed + point * 13) % 18))),
    duplicateCount: 0,
    searchText: [signal?.title, signal?.source?.name, signal?.evidence, signal?.action, ...(signal?.tags || [])].filter(Boolean).join(" ").toLocaleLowerCase("es")
  };
}

export function normalizeSignals(payload) {
  if (!Array.isArray(payload?.signals)) throw new TypeError("El payload debe contener un arreglo signals");
  return payload.signals.map(normalizeSignal);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
```

- [ ] **Step 4: Ejecutar la prueba y confirmar que pasa**

Run: `node --test tests/domain/normalize-signal.test.mjs`

Expected: PASS, 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/domain/normalize-signal.mjs tests/domain/normalize-signal.test.mjs
git commit -m "feat: normalizar señales para el dashboard"
```

### Task 2: Búsqueda, filtros, orden y paginación

**Files:**
- Create: `src/domain/filter-signals.mjs`
- Create: `src/domain/sort-signals.mjs`
- Create: `src/domain/paginate-signals.mjs`
- Create: `tests/domain/signal-collection.test.mjs`

**Interfaces:**
- Consumes: señales normalizadas por `normalizeSignals(payload)`.
- Produces: `filterSignals(signals, filters)`, `sortSignals(signals, key, direction)` y `paginateSignals(signals, page, pageSize)`.

- [ ] **Step 1: Escribir pruebas de comportamiento para la colección**

```js
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
```

- [ ] **Step 2: Ejecutar la prueba y observar módulos ausentes**

Run: `node --test tests/domain/signal-collection.test.mjs`

Expected: FAIL con `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implementar las funciones puras**

```js
// src/domain/filter-signals.mjs
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

// src/domain/sort-signals.mjs
export function sortSignals(signals, key = "composite", direction = "desc") {
  const multiplier = direction === "asc" ? 1 : -1;
  const valueFor = (signal) => key === "composite" ? signal.compositeScore : signal.scores[key] ?? 0;
  return signals.map((signal, index) => ({ signal, index })).sort((left, right) => (valueFor(left.signal) - valueFor(right.signal)) * multiplier || left.index - right.index).map(({ signal }) => signal);
}

// src/domain/paginate-signals.mjs
export function paginateSignals(signals, requestedPage = 1, pageSize = 7) {
  const totalPages = Math.max(1, Math.ceil(signals.length / pageSize));
  const page = Math.max(1, Math.min(Number(requestedPage) || 1, totalPages));
  const start = (page - 1) * pageSize;
  return { items: signals.slice(start, start + pageSize), page, pageSize, total: signals.length, totalPages };
}
```

- [ ] **Step 4: Ejecutar las pruebas de dominio completas**

Run: `node --test "tests/domain/*.test.mjs"`

Expected: PASS, 6 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/domain tests/domain/signal-collection.test.mjs
git commit -m "feat: agregar exploracion de señales"
```

### Task 3: Carga del fixture y servidor local

**Files:**
- Create: `src/data/load-signals.mjs`
- Create: `tests/domain/load-signals.test.mjs`
- Create: `scripts/serve-frontend.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `FIXTURE_URL`, `loadSignals(fetchImpl = fetch, url = FIXTURE_URL)` y servidor HTTP en `PORT` o `4173`.
- `loadSignals` retorna `{ payload, provenance }`, donde `provenance` identifica fixture, ruta y fecha de generación.

- [ ] **Step 1: Escribir pruebas para éxito y error de carga**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_URL, loadSignals } from "../../src/data/load-signals.mjs";

test("loadSignals declara la procedencia del fixture", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ generatedAt: "2026-08-05T00:15:06Z", signals: [] }) });
  const result = await loadSignals(fetchImpl);
  assert.equal(FIXTURE_URL, "/data/fixtures/daily-signals/2026-08-04.json");
  assert.equal(result.provenance.kind, "fixture");
  assert.equal(result.provenance.path, FIXTURE_URL);
});

test("loadSignals traduce una respuesta HTTP fallida", async () => {
  const fetchImpl = async () => ({ ok: false, status: 404 });
  await assert.rejects(() => loadSignals(fetchImpl), /No se pudo cargar el fixture \(404\)/);
});
```

- [ ] **Step 2: Ejecutar la prueba y confirmar que falla**

Run: `node --test tests/domain/load-signals.test.mjs`

Expected: FAIL con `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implementar el adaptador de datos**

```js
export const FIXTURE_URL = "/data/fixtures/daily-signals/2026-08-04.json";

export async function loadSignals(fetchImpl = fetch, url = FIXTURE_URL) {
  const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`No se pudo cargar el fixture (${response.status})`);
  const payload = await response.json();
  return { payload, provenance: { kind: "fixture", path: url, generatedAt: payload.generatedAt || "Sin dato" } };
}
```

- [ ] **Step 4: Crear un servidor estático seguro y el comando de desarrollo**

```js
// scripts/serve-frontend.js
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const requested = pathname === "/" ? "/src/index.html" : pathname;
  const filePath = path.resolve(root, `.${requested}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) return end(response, 403, "Forbidden");
  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(body);
  } catch (error) {
    end(response, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : "Server error");
  }
}).listen(port, "127.0.0.1", () => console.log(`AI Radar: http://127.0.0.1:${port}`));

function end(response, status, message) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}
```

Agregar a `package.json`:

```json
"dev": "node scripts/serve-frontend.js",
"test:domain": "node --test \"tests/domain/*.test.mjs\""
```

- [ ] **Step 5: Verificar adaptador, servidor y suite existente**

Run: `node --test tests/domain/load-signals.test.mjs && npm test`

Expected: ambas suites PASS y sin advertencias.

- [ ] **Step 6: Commit**

```bash
git add src/data/load-signals.mjs tests/domain/load-signals.test.mjs scripts/serve-frontend.js package.json
git commit -m "feat: servir fixtures al frontend"
```

### Task 4: Estructura accesible y sistema visual responsive

**Files:**
- Create: `src/index.html`
- Create: `src/styles.css`
- Create: `tests/ui/structure.test.mjs`

**Interfaces:**
- Produce IDs consumidos por `app.mjs`: `app-status`, `search-input`, `date-filter`, `source-filter`, `sort-key`, `sort-direction`, `mode-reader`, `mode-operator`, `export-button`, `signals-container`, `result-summary`, `pagination` y `clear-filters`.

- [ ] **Step 1: Escribir una prueba estructural que falle**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("index contiene controles etiquetados y regiones de estado", () => {
  const html = fs.readFileSync(new URL("../../src/index.html", import.meta.url), "utf8");
  for (const fragment of ["<main", "aria-live=\"polite\"", "for=\"search-input\"", "id=\"signals-container\"", "id=\"pagination\"", "type=\"module\""]) assert.ok(html.includes(fragment), fragment);
});
```

- [ ] **Step 2: Ejecutar la prueba y confirmar el fallo**

Run: `node --test tests/ui/structure.test.mjs`

Expected: FAIL con `ENOENT` para `src/index.html`.

- [ ] **Step 3: Crear el HTML semántico completo**

Crear `src/index.html` con `lang="es"`, skip link, `header`, marca AI Radar, búsqueda etiquetada, selector de modo con botones y `aria-pressed`, filtros con `label` y `select`, aviso “Demo local · fixture 2026-08-04”, región `#app-status[aria-live="polite"]`, `main`, encabezado “Ranking de señales”, `#signals-container[aria-busy="true"]`, `#result-summary`, navegación `#pagination[aria-label="Paginación de señales"]`, botón de exportación y `<script type="module" src="/src/app.mjs"></script>`.

- [ ] **Step 4: Crear CSS fiel a la referencia y responsive**

Definir en `src/styles.css`:

```css
:root {
  color-scheme: dark;
  --bg: #07111d;
  --surface: #0b1827;
  --surface-strong: #102238;
  --line: #22364a;
  --text: #f5f8fc;
  --muted: #a8b4c5;
  --blue: #2583ff;
  --green: #78dc35;
  --amber: #ffc21c;
  --danger: #ff6b7a;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; background: radial-gradient(circle at 50% 0%, #10223a 0, var(--bg) 42rem); color: var(--text); }
button, input, select { min-height: 44px; font: inherit; color: inherit; }
:focus-visible { outline: 3px solid #66a9ff; outline-offset: 3px; }
.skip-link { position: fixed; left: 1rem; top: -5rem; z-index: 100; }
.skip-link:focus { top: 1rem; }
.shell { width: min(100% - 2rem, 1440px); margin-inline: auto; }
.signals-table { width: 100%; border-collapse: collapse; }
.signal-card { display: none; }
@media (max-width: 760px) {
  .signals-table { display: none; }
  .signal-card { display: grid; gap: .75rem; }
  .toolbar { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
```

Completar los estilos de encabezado, controles, tabla, tarjetas, badges, estados, sparkline SVG y paginación conforme a la referencia, manteniendo contraste y evitando anchuras fijas que produzcan overflow.

- [ ] **Step 5: Ejecutar la prueba estructural y comprobar HTML/CSS en servidor**

Run: `node --test tests/ui/structure.test.mjs`

Expected: PASS, 1 test.

Run: `npm run dev`

Expected: imprime `AI Radar: http://127.0.0.1:4173` y `/` responde 200.

- [ ] **Step 6: Commit**

```bash
git add src/index.html src/styles.css tests/ui/structure.test.mjs
git commit -m "feat: crear estructura visual de AI Radar"
```

### Task 5: Estado, renderizado e interacciones

**Files:**
- Create: `src/app.mjs`
- Modify: `src/index.html`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `loadSignals`, `normalizeSignals`, `filterSignals`, `sortSignals`, `paginateSignals` y los IDs del Task 4.
- Produce: aplicación interactiva, descarga JSON mediante `exportVisibleSignals(items)` y renderizado de tabla/tarjetas desde una única colección paginada.

- [ ] **Step 1: Añadir un test unitario para el modelo exportado**

Crear `src/domain/export-signals.mjs` y `tests/domain/export-signals.test.mjs` comenzando por:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { serializeVisibleSignals } from "../../src/domain/export-signals.mjs";

test("serializeVisibleSignals exporta solo campos públicos visibles", () => {
  const json = serializeVisibleSignals([{ id: "a", title: "Señal", compositeScore: 80, sourceName: "Fuente", sourceUrl: "https://example.com" }]);
  assert.deepEqual(JSON.parse(json), [{ id: "a", title: "Señal", score: 80, source: "Fuente", url: "https://example.com" }]);
});
```

- [ ] **Step 2: Ejecutar el test y confirmar el fallo**

Run: `node --test tests/domain/export-signals.test.mjs`

Expected: FAIL con `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implementar serialización mínima**

```js
export function serializeVisibleSignals(signals) {
  return JSON.stringify(signals.map(({ id, title, compositeScore, sourceName, sourceUrl }) => ({ id, title, score: compositeScore, source: sourceName, url: sourceUrl })), null, 2);
}
```

- [ ] **Step 4: Implementar `app.mjs`**

El módulo debe:

1. iniciar con `{ phase: "loading", query: "", source: "all", days: "7", sortKey: "composite", direction: "desc", mode: "reader", page: 1, pageSize: 7 }`;
2. cargar el fixture, normalizarlo y poblar las opciones de fuente;
3. recalcular `filterSignals` → `sortSignals` → `paginateSignals` en cada cambio;
4. escapar texto antes de interpolarlo con una función `escapeHtml`;
5. renderizar una tabla semántica y las tarjetas móviles equivalentes;
6. dibujar tendencias con SVG `polyline` marcado `aria-hidden="true"` y acompañarlo con texto de tendencia;
7. renderizar carga, vacío y error en `#signals-container`;
8. restablecer filtros desde `#clear-filters`;
9. cambiar `aria-pressed` en los modos y aplicar `data-mode` al documento;
10. exportar únicamente los resultados de la página visible con `serializeVisibleSignals` y `URL.createObjectURL`;
11. actualizar `#app-status`, `#result-summary` y paginación después de cada acción.

La ruta de error debe poder activarse en QA mediante `?fixture=missing`; solo se aceptará la ruta conocida `/data/fixtures/daily-signals/missing.json`, sin permitir URLs arbitrarias.

- [ ] **Step 5: Ejecutar todas las pruebas unitarias**

Run: `npm run test:domain && npm test`

Expected: ambas suites PASS, 0 failures.

- [ ] **Step 6: Probar manualmente el flujo base**

Run: `npm run dev`

Abrir: `http://127.0.0.1:4173`

Expected: se muestra el aviso de fixture, las señales del archivo, los controles cambian resultados y la exportación descarga JSON sin recargar la página.

- [ ] **Step 7: Commit**

```bash
git add src/app.mjs src/domain/export-signals.mjs tests/domain/export-signals.test.mjs src/index.html src/styles.css
git commit -m "feat: agregar interacciones al radar"
```

### Task 6: QA de navegador y capturas verificables

**Files:**
- Create: `playwright.config.js`
- Create: `tests/ui/ai-radar.spec.js`
- Modify: `package.json`
- Create: `snapshots/ai-radar-desktop-success.png`
- Create: `snapshots/ai-radar-mobile-success.png`
- Create: `snapshots/ai-radar-desktop-error.png`

**Interfaces:**
- Consumes: servidor `npm run dev` en puerto 4173.
- Produce: `npm run test:ui` y tres capturas finales identificadas.

- [ ] **Step 1: Instalar Playwright y agregar scripts**

Run: `npm install --save-dev @playwright/test && npx playwright install chromium`

Agregar a `package.json`:

```json
"test:ui": "playwright test",
"test:all": "npm test && npm run test:domain && npm run test:ui"
```

- [ ] **Step 2: Crear configuración de Playwright**

```js
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/ui",
  testMatch: "**/*.spec.js",
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  webServer: { command: "npm run dev", url: "http://127.0.0.1:4173", reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } }
  ]
});
```

- [ ] **Step 3: Escribir pruebas E2E que inicialmente expongan huecos**

```js
const { test, expect } = require("@playwright/test");
const path = require("node:path");

test("carga fixture, filtra y mantiene consola limpia", async ({ page }, testInfo) => {
  const messages = [];
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) messages.push(`${message.type()}: ${message.text()}`); });
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  await page.goto("/");
  await expect(page.getByText(/Demo local.*fixture 2026-08-04/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ranking de señales" })).toBeVisible();
  await page.getByLabel("Buscar señales").fill("agentes");
  await expect(page.locator("[data-signal-id]").first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(messages).toEqual([]);
  const name = testInfo.project.name === "mobile" ? "ai-radar-mobile-success.png" : "ai-radar-desktop-success.png";
  await page.screenshot({ path: path.join("snapshots", name), fullPage: true });
});

test("muestra vacío y permite limpiar filtros", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Buscar señales").fill("resultado-inexistente-xyz");
  await expect(page.getByText("No encontramos señales")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.locator("[data-signal-id]").first()).toBeVisible();
});

test("muestra error accesible y permite reintentar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "La captura de error se conserva en escritorio");
  await page.goto("/?fixture=missing");
  await expect(page.getByRole("alert")).toContainText("No pudimos cargar las señales");
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await page.screenshot({ path: path.join("snapshots", "ai-radar-desktop-error.png"), fullPage: true });
});

test("controles principales funcionan por teclado", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Buscar señales")).toBeFocused();
});
```

- [ ] **Step 4: Ejecutar E2E y corregir únicamente fallos observados**

Run: `npm run test:ui`

Expected: todos los tests pasan en desktop y mobile, salvo el skip explícito del error móvil; consola sin mensajes capturados y sin overflow horizontal.

- [ ] **Step 5: Inspeccionar visualmente las tres capturas**

Abrir `snapshots/ai-radar-desktop-success.png`, `snapshots/ai-radar-mobile-success.png` y `snapshots/ai-radar-desktop-error.png`.

Expected: contenido sin recortes, jerarquía comparable con la referencia, controles legibles y datos identificados como fixture.

- [ ] **Step 6: Ejecutar verificación completa y fresca**

Run: `npm run test:all`

Expected: `npm test`, pruebas de dominio y Playwright pasan con 0 failures; no hay errores ni advertencias relevantes.

- [ ] **Step 7: Revisar el diff y confirmar que no incluye archivos ajenos**

Run: `git status --short && git diff --check`

Expected: solo aparecen archivos del frontend, QA, package lock y capturas; `docs/visual-reference/` permanece sin añadir si sigue siendo un cambio del usuario.

- [ ] **Step 8: Commit final de QA**

```bash
git add package.json package-lock.json playwright.config.js tests/ui/ai-radar.spec.js snapshots/ai-radar-desktop-success.png snapshots/ai-radar-mobile-success.png snapshots/ai-radar-desktop-error.png
git commit -m "test: verificar dashboard de AI Radar"
```

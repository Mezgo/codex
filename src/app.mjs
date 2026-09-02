import { loadSignals, FIXTURE_URL } from "./data/load-signals.mjs";
import { selectFixtureUrl } from "./data/select-fixture.mjs";
import { normalizeSignals } from "./domain/normalize-signal.mjs";
import { filterSignals } from "./domain/filter-signals.mjs";
import { sortSignals } from "./domain/sort-signals.mjs";
import { paginateSignals } from "./domain/paginate-signals.mjs";
import { serializeVisibleSignals } from "./domain/export-signals.mjs";
import { bindFilterFormSubmit } from "./ui/prevent-form-submit.mjs";

const DEFAULT_FILTERS = {
  query: "",
  source: "all",
  days: "7",
  sortKey: "composite",
  direction: "desc",
  page: 1
};

const state = {
  phase: "loading",
  ...DEFAULT_FILTERS,
  mode: "reader",
  pageSize: 7,
  signals: [],
  error: null,
  provenance: null
};

const elements = {
  appStatus: document.querySelector("#app-status"),
  clearFilters: document.querySelector("#clear-filters"),
  container: document.querySelector("#signals-container"),
  dateFilter: document.querySelector("#date-filter"),
  exportButton: document.querySelector("#export-button"),
  modeOperator: document.querySelector("#mode-operator"),
  modeReader: document.querySelector("#mode-reader"),
  pagination: document.querySelector("#pagination"),
  resultSummary: document.querySelector("#result-summary"),
  searchInput: document.querySelector("#search-input"),
  sortDirection: document.querySelector("#sort-direction"),
  sortKey: document.querySelector("#sort-key"),
  sourceFilter: document.querySelector("#source-filter"),
  toolbar: document.querySelector("#filters-form")
};

let visiblePage = { items: [], page: 1, total: 0, totalPages: 1 };

function escapeHtml(value) {
  return String(value ?? "Sin dato")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function scoreClass(score) {
  if (score >= 75) return "";
  if (score >= 55) return "is-amber";
  return "is-muted";
}

function statusClass(label) {
  if (label === "Señal fuerte") return "is-strong";
  if (label === "En revisión" || label === "Datos parciales") return "is-review";
  return "is-error";
}

function trendLabel(trend) {
  const difference = trend.at(-1) - trend[0];
  if (difference > 2) return "Tendencia al alza";
  if (difference < -2) return "Tendencia a la baja";
  return "Tendencia estable";
}

function trendMarkup(signal) {
  const trend = Array.isArray(signal.trend) && signal.trend.length > 1 ? signal.trend : [50, 50];
  const width = 100;
  const height = 36;
  const points = trend.map((value, index) => {
    const x = Math.round((index / (trend.length - 1)) * width);
    const y = Math.round(height - (Math.max(0, Math.min(100, Number(value) || 0)) / 100) * height);
    return `${x},${y}`;
  }).join(" ");
  const label = trendLabel(trend);

  return `
    <svg class="sparkline ${scoreClass(signal.compositeScore)}" viewBox="0 0 100 36" focusable="false" aria-hidden="true">
      <polyline points="${points}"></polyline>
    </svg>
    <span class="trend-label">${escapeHtml(label)}</span>
  `;
}

function sourceMarkup(signal) {
  const sourceName = escapeHtml(signal.sourceName);
  const sourceUrl = safeExternalUrl(signal.sourceUrl);
  if (!sourceUrl) return `<span>${sourceName}</span>`;
  return `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${sourceName}</a>`;
}

function tagsMarkup(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return '<span class="tag">Sin etiquetas</span>';
  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function scoresMarkup(signal) {
  const labels = {
    novelty: "Novedad",
    impact: "Impacto",
    evidence: "Evidencia",
    actionability: "Acción"
  };
  return `
    <dl class="score-list" aria-label="Puntuaciones derivadas en esta interfaz">
      ${Object.entries(labels).map(([key, label]) => `
        <div>
          <dt>${label}</dt>
          <dd class="${scoreClass(signal.scores[key])}">${escapeHtml(signal.scores[key])}</dd>
        </div>
      `).join("")}
    </dl>
  `;
}

function signalDetailsMarkup(signal) {
  const duplicate = signal.duplicateCount > 0
    ? `<span>${escapeHtml(signal.duplicateCount)} coincidencia(s)</span>`
    : "";
  return `
    <h2 class="signal-title">${escapeHtml(signal.title)}</h2>
    <div class="signal-meta">
      <span>${escapeHtml(signal.type)}</span>
      ${sourceMarkup(signal)}
      <time datetime="${escapeHtml(signal.publishedAt)}">${escapeHtml(signal.publishedAt)}</time>
      ${duplicate}
    </div>
    <div class="signal-tags" aria-label="Etiquetas">${tagsMarkup(signal.tags)}</div>
  `;
}

function renderSignals(items, page) {
  const rows = items.map((signal, index) => `
    <tr>
      <td class="signal-rank">${escapeHtml((page.page - 1) * state.pageSize + index + 1)}</td>
      <td>${signalDetailsMarkup(signal)}</td>
      <td>
        <strong class="score ${scoreClass(signal.compositeScore)}">${escapeHtml(signal.compositeScore)}</strong>
        <span class="derived-note">Derivada en esta interfaz</span>
      </td>
      <td>${scoresMarkup(signal)}</td>
      <td>${trendMarkup(signal)}</td>
      <td><span class="status-badge ${statusClass(signal.statusLabel)}">${escapeHtml(signal.statusLabel)}</span></td>
    </tr>
  `).join("");
  const cards = items.map((signal, index) => `
    <article class="signal-card" role="listitem">
      <div class="signal-card-header">
        <span class="signal-rank">#${escapeHtml((page.page - 1) * state.pageSize + index + 1)}</span>
        <span class="score ${scoreClass(signal.compositeScore)}">${escapeHtml(signal.compositeScore)} · derivada en esta interfaz</span>
      </div>
      ${signalDetailsMarkup(signal)}
      ${scoresMarkup(signal)}
      <div class="signal-card-footer">
        <span class="status-badge ${statusClass(signal.statusLabel)}">${escapeHtml(signal.statusLabel)}</span>
        <span class="trend">${trendMarkup(signal)}</span>
      </div>
    </article>
  `).join("");

  elements.container.innerHTML = `
    <table class="signals-table">
      <caption class="visually-hidden">Ranking de señales del fixture local</caption>
      <thead>
        <tr>
          <th scope="col">Posición</th>
          <th scope="col">Señal</th>
          <th scope="col">Puntuación</th>
          <th scope="col">Dimensiones UI</th>
          <th scope="col">Tendencia</th>
          <th scope="col">Estado</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="signal-cards" role="list" aria-label="Señales del ranking">${cards}</div>
  `;
}

function renderLoading() {
  elements.container.setAttribute("aria-busy", "true");
  elements.container.innerHTML = `
    <div class="state-message" role="status">
      <span class="loading-dot" aria-hidden="true"></span>
      <p>Cargando señales locales…</p>
    </div>
  `;
  elements.appStatus.textContent = "Cargando el fixture local declarado.";
  elements.resultSummary.textContent = "Cargando señales para el ranking…";
  renderPagination({ page: 1, total: 0, totalPages: 1 });
}

function renderError() {
  elements.container.setAttribute("aria-busy", "false");
  elements.container.innerHTML = `
    <div class="state-message" role="alert">
      <p><strong>No se pudieron cargar las señales.</strong></p>
      <p>${escapeHtml(state.error?.message || "Error desconocido")}</p>
      <button class="button button-primary" type="button" data-action="retry">Reintentar</button>
    </div>
  `;
  elements.appStatus.textContent = "La carga del fixture local falló.";
  elements.resultSummary.textContent = "No hay resultados disponibles hasta reintentar.";
  renderPagination({ page: 1, total: 0, totalPages: 1 });
}

function renderEmpty() {
  elements.container.innerHTML = `
    <div class="state-message" role="status">
      <p><strong>No hay señales con estos filtros.</strong></p>
      <p>Prueba otra búsqueda o restablece los filtros.</p>
      <button class="button button-quiet" type="button" data-action="clear">Limpiar filtros</button>
    </div>
  `;
}

function renderPagination(page) {
  const hasResults = page.total > 0;
  elements.pagination.innerHTML = `
    <button class="pagination-button" type="button" data-page="previous" aria-label="Página anterior" ${!hasResults || page.page <= 1 ? "disabled" : ""}>Anterior</button>
    <span class="pagination-status">${hasResults ? `Página ${escapeHtml(page.page)} de ${escapeHtml(page.totalPages)}` : "Sin páginas disponibles"}</span>
    <button class="pagination-button" type="button" data-page="next" aria-label="Página siguiente" ${!hasResults || page.page >= page.totalPages ? "disabled" : ""}>Siguiente</button>
  `;
}

function renderMode() {
  document.documentElement.dataset.mode = state.mode;
  const isReader = state.mode === "reader";
  elements.modeReader.setAttribute("aria-pressed", String(isReader));
  elements.modeOperator.setAttribute("aria-pressed", String(!isReader));
  elements.modeReader.classList.toggle("is-selected", isReader);
  elements.modeOperator.classList.toggle("is-selected", !isReader);
}

function render() {
  renderMode();
  elements.exportButton.disabled = state.phase !== "success" || state.signals.length === 0;

  if (state.phase === "loading") return renderLoading();
  if (state.phase === "error") return renderError();

  const filtered = filterSignals(state.signals, state);
  const sorted = sortSignals(filtered, state.sortKey, state.direction);
  visiblePage = paginateSignals(sorted, state.page, state.pageSize);
  state.page = visiblePage.page;

  elements.container.setAttribute("aria-busy", "false");
  elements.exportButton.disabled = visiblePage.items.length === 0;
  elements.appStatus.textContent = `Datos de fixture local: ${state.provenance?.path || FIXTURE_URL}. Puntuaciones calculadas en esta interfaz.`;
  elements.resultSummary.textContent = visiblePage.total === 0
    ? "0 señales coinciden con los filtros."
    : `${visiblePage.total} señal${visiblePage.total === 1 ? "" : "es"}; mostrando ${((visiblePage.page - 1) * state.pageSize) + 1}–${((visiblePage.page - 1) * state.pageSize) + visiblePage.items.length}.`;

  if (visiblePage.total === 0) renderEmpty();
  else renderSignals(visiblePage.items, visiblePage);
  renderPagination(visiblePage);
}

function populateSources() {
  const previous = state.source;
  elements.sourceFilter.replaceChildren(new Option("Todas las fuentes", "all"));
  const sources = [...new Set(state.signals.map(({ sourceName }) => sourceName))].sort((left, right) => left.localeCompare(right, "es"));
  for (const source of sources) elements.sourceFilter.add(new Option(source, source));
  elements.sourceFilter.value = sources.includes(previous) ? previous : "all";
  state.source = elements.sourceFilter.value;
}

async function start() {
  state.phase = "loading";
  state.error = null;
  render();

  try {
    const result = await loadSignals(fetch, selectFixtureUrl(window.location.search));
    state.signals = normalizeSignals(result.payload);
    state.provenance = result.provenance;
    state.phase = "success";
    populateSources();
  } catch (error) {
    state.signals = [];
    state.provenance = null;
    state.error = error instanceof Error ? error : new Error("No se pudo interpretar el fixture");
    state.phase = "error";
  }

  render();
}

function syncControls() {
  elements.searchInput.value = state.query;
  elements.sourceFilter.value = state.source;
  elements.dateFilter.value = state.days;
  elements.sortKey.value = state.sortKey;
  elements.sortDirection.value = state.direction;
}

function clearFilters() {
  Object.assign(state, DEFAULT_FILTERS);
  syncControls();
  render();
}

export function exportVisibleSignals(items) {
  const blob = new Blob([serializeVisibleSignals(items)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ai-radar-resultados-visibles.json";
  link.hidden = true;
  document.body.append(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.currentTarget.value;
  state.page = 1;
  render();
});

elements.dateFilter.addEventListener("change", (event) => {
  state.days = event.currentTarget.value;
  state.page = 1;
  render();
});

elements.sourceFilter.addEventListener("change", (event) => {
  state.source = event.currentTarget.value;
  state.page = 1;
  render();
});

elements.sortKey.addEventListener("change", (event) => {
  state.sortKey = event.currentTarget.value;
  state.page = 1;
  render();
});

elements.sortDirection.addEventListener("change", (event) => {
  state.direction = event.currentTarget.value;
  state.page = 1;
  render();
});

elements.modeReader.addEventListener("click", () => {
  state.mode = "reader";
  render();
});

elements.modeOperator.addEventListener("click", () => {
  state.mode = "operator";
  render();
});

elements.clearFilters.addEventListener("click", clearFilters);
bindFilterFormSubmit(elements.toolbar);
elements.exportButton.addEventListener("click", () => {
  exportVisibleSignals(visiblePage.items);
  elements.appStatus.textContent = `Exportación JSON preparada con ${visiblePage.items.length} señal${visiblePage.items.length === 1 ? "" : "es"} visibles.`;
});

elements.pagination.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (!button || button.disabled) return;
  state.page += button.dataset.page === "next" ? 1 : -1;
  render();
  elements.resultSummary.focus({ preventScroll: true });
});

elements.container.addEventListener("click", (event) => {
  const action = event.target.closest("button[data-action]")?.dataset.action;
  if (action === "clear") clearFilters();
  if (action === "retry") start();
});

syncControls();
start();

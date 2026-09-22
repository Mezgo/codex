const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const { prepareSnapshot } = require("./snapshot-artifacts.js");

const APP_ORIGIN = "http://127.0.0.1:4173";
const FIXTURE_PATH = "/data/fixtures/daily-signals/2026-08-04.json";

// Existing interaction tests exercise controls inside the mobile disclosure.
test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name !== "mobile" || testInfo.title.includes("menú responsive")) return;
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelector("#filters-toggle")?.click();
    });
  });
});

test("menú responsive inicia cerrado y conserva filtros al alternar", async ({ page }, testInfo) => {
  const observations = observeBrowser(page);
  await page.setViewportSize({ width: 725, height: 788 });
  await page.goto("/");
  const button = page.locator("#filters-toggle");
  const form = page.getByRole("form", { name: "Filtros del ranking" });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(form).toBeHidden();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(form).toBeVisible();
  await page.getByLabel("Categoría de fuente").selectOption("official");
  const ids = await visibleSignalIds(page);
  await page.getByLabel("Categoría de fuente").press("Escape");
  await expect(form).toBeHidden();
  await expect(button).toBeFocused();
  expect(await visibleSignalIds(page)).toEqual(ids);
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Categoría de fuente")).toHaveValue("official");
  await button.click();
  await page.screenshot({ path: `snapshots/filters-collapsed-${testInfo.project.name}.png` });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(button).toBeHidden();
  await expect(form).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(form).toBeHidden();
  await expectNoHorizontalOverflow(page);
  expectCleanBrowser(observations);
});

function observeBrowser(page, { allowMissingFixture = false } = {}) {
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];
  const unexpectedResponses = [];
  const unexpectedOrigins = [];

  page.on("console", (message) => {
    const expectedMissingResource = allowMissingFixture
      && message.type() === "error"
      && /status of 404/i.test(message.text());
    if (["error", "warning"].includes(message.type())) {
      if (expectedMissingResource) return;
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== APP_ORIGIN) unexpectedOrigins.push(request.url());
  });
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  page.on("response", (response) => {
    const expectedMissing = allowMissingFixture
      && response.url() === `${APP_ORIGIN}/data/fixtures/daily-signals/missing.json`
      && response.status() === 404;
    if (response.status() >= 400 && !expectedMissing) {
      unexpectedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  return { consoleMessages, pageErrors, failedRequests, unexpectedResponses, unexpectedOrigins };
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
  await expect.poll(() => page.locator("#signals-container").evaluate((container) => (
    container.scrollWidth <= container.clientWidth
  ))).toBe(true);
}

function expectCleanBrowser(observations) {
  expect(observations.consoleMessages, "advertencias o errores de consola").toEqual([]);
  expect(observations.pageErrors, "errores JavaScript no controlados").toEqual([]);
  expect(observations.failedRequests, "solicitudes de red fallidas").toEqual([]);
  expect(observations.unexpectedResponses, "respuestas HTTP inesperadas").toEqual([]);
  expect(observations.unexpectedOrigins, "solicitudes fuera del servidor local").toEqual([]);
}

function readPngDimensions(snapshotPath) {
  const png = fs.readFileSync(snapshotPath);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

async function visibleSignalIds(page) {
  return page.locator("[data-signal-id]:visible").evaluateAll((signals) => (
    signals.map((signal) => signal.dataset.signalId)
  ));
}

async function visibleScores(page, key) {
  const attribute = key === "composite" ? "data-score-composite" : `data-score-${key}`;
  return page.locator("[data-signal-id]:visible").evaluateAll((signals, scoreAttribute) => (
    signals.map((signal) => {
      const value = signal.getAttribute(scoreAttribute);
      return value === null || value === "missing" ? null : Number(value);
    })
  ), attribute);
}

test("carga el fixture declarado, busca y conserva navegador limpio", async ({ page }, testInfo) => {
  const observations = observeBrowser(page);
  const fixtureResponse = page.waitForResponse((response) => response.url() === `${APP_ORIGIN}${FIXTURE_PATH}`);

  await page.goto("/");
  expect((await fixtureResponse).status()).toBe(200);
  await expect(page.getByText(/Demo local.*fixture 2026-08-04/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ranking de señales" })).toBeVisible();
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();
  await expect(page.getByLabel("Fecha")).toHaveValue("all");
  const nextPageButton = page.getByRole("button", { name: "Página siguiente" });
  await expect(nextPageButton).toBeEnabled();

  await page.getByRole("button", { name: "Modo operador" }).click();
  await nextPageButton.scrollIntoViewIfNeeded();
  const snapshotPath = prepareSnapshot({ projectName: testInfo.project.name, state: "success" });
  await page.screenshot({ path: snapshotPath, fullPage: false });
  expect(readPngDimensions(snapshotPath)).toEqual(testInfo.project.name === "mobile"
    ? { width: 390, height: 844 }
    : { width: 1440, height: 900 });
  await page.getByRole("button", { name: "Modo lector" }).click();

  await page.getByLabel("Buscar señales").fill("agentes");
  await expect(page.locator("[data-signal-id]:visible", { hasText: "AISI y OpenAI detallan incidentes de agentes en pruebas cyber" })).toHaveCount(1);
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();

  await expectNoHorizontalOverflow(page);
  expectCleanBrowser(observations);
});

test("cambia orden ascendente, descendente y por una dimensión", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();

  await page.getByLabel("Dirección").selectOption("asc");
  await expect.poll(async () => {
    const scores = await visibleScores(page, "composite");
    return scores.every(Number.isFinite)
      && scores.every((score, index) => index === 0 || scores[index - 1] <= score);
  }).toBe(true);

  await page.getByLabel("Ordenar por").selectOption("evidence");
  await page.getByLabel("Dirección").selectOption("desc");
  await expect.poll(async () => {
    const scores = await visibleScores(page, "evidence");
    return scores.every(Number.isFinite)
      && scores.every((score, index) => index === 0 || scores[index - 1] >= score);
  }).toBe(true);
});

test("los modos lector y operador cambian contenido y jerarquía", async ({ page }) => {
  await page.goto("/");
  const firstSignal = page.locator("[data-signal-id]:visible").first();
  await expect(firstSignal).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "reader");
  await expect(firstSignal.locator('[data-mode-content="reader"]')).toBeVisible();
  await expect(firstSignal.locator('[data-mode-content="operator"]')).toBeHidden();

  await page.getByRole("button", { name: "Modo operador" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "operator");
  await expect(firstSignal.locator('[data-mode-content="reader"]')).toBeHidden();
  await expect(firstSignal.locator('[data-mode-content="operator"]')).toBeVisible();
  await expect(firstSignal.locator(".score-list")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("exporta la página visible y navega realmente a la siguiente", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();
  const firstPageIds = await visibleSignalIds(page);
  expect(firstPageIds.length).toBeGreaterThan(1);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  const exported = JSON.parse(fs.readFileSync(downloadedPath, "utf8"));
  expect(exported.map(({ id }) => id)).toEqual(firstPageIds);
  expect(exported.every((signal) => (
    Object.keys(signal).sort().join(",") === "id,score,source,title,url"
  ))).toBe(true);

  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(page.locator(".pagination-status")).toContainText("Página 2 de");
  await expect(page.locator("#result-summary")).toBeFocused();
  const secondPageIds = await visibleSignalIds(page);
  expect(secondPageIds.length).toBeGreaterThan(0);
  expect(secondPageIds.some((id) => firstPageIds.includes(id))).toBe(false);
});

test("combina categoría, búsqueda y fecha y restablece filtros", async ({ page }, testInfo) => {
  const observations = observeBrowser(page);
  const fixture = JSON.parse(fs.readFileSync(`.${FIXTURE_PATH}`, "utf8"));
  await page.goto("/");
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();
  await page.getByRole("button", { name: "Página siguiente" }).click();
  const category = page.getByLabel("Categoría de fuente");
  await category.selectOption("official");
  const officialIds = fixture.signals.filter((signal) => signal.sourceProfile.type === "official").map(({ id }) => id);
  await expect(page.locator("#result-summary")).toContainText(`${officialIds.length} señales`);
  expect((await visibleSignalIds(page)).every((id) => officialIds.includes(id))).toBe(true);
  await expect(page.locator(".pagination-status")).toContainText("Página 1 de");
  await expect(category.locator("option")).not.toContainText(["Comision Europea"]);
  await category.selectOption("mixed");
  await page.getByLabel("Buscar señales").fill("Comision Europea");
  await page.getByLabel("Fecha").selectOption("7");
  await expect(page.getByText("No encontramos señales")).toBeVisible();
  await page.getByLabel("Fecha").selectOption("all");
  await expect(page.locator("[data-signal-id]:visible", { hasText: "La Comision Europea publica guias de transparencia del AI Act" })).toHaveCount(1);
  await expect(page.locator("[data-signal-id]")).toHaveCount(2);
  await category.focus();
  await expect(category).toHaveCSS("outline-style", "solid");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `snapshots/source-category-${testInfo.project.name}.png`, fullPage: false });
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(category).toHaveValue("all");
  await expect(page.getByLabel("Buscar señales")).toHaveValue("");
  await expect(page.locator("#result-summary")).toContainText(`${fixture.signals.length} señales`);
  expectCleanBrowser(observations);
});

test("muestra vacío y permite limpiar filtros", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Buscar señales").fill("resultado-inexistente-xyz");
  await expect(page.getByText("No encontramos señales")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).last().click();
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();
  await expect(page.getByLabel("Buscar señales")).toHaveValue("");
  await expect(page.locator("#result-summary")).toBeFocused();
});

test("muestra error accesible y permite reintentar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "La captura de error se conserva en escritorio");
  const observations = observeBrowser(page, { allowMissingFixture: true });
  let attempts = 0;
  page.on("response", (response) => {
    if (response.url().endsWith("/data/fixtures/daily-signals/missing.json")) attempts += 1;
  });

  await page.goto("/?fixture=missing");
  await expect(page.getByRole("alert")).toContainText("No pudimos cargar las señales");
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect.poll(() => attempts).toBe(2);
  await expect(page.getByRole("alert")).toContainText("No pudimos cargar las señales");
  await expect(page.locator("#result-summary")).toBeFocused();
  await expectNoHorizontalOverflow(page);
  expectCleanBrowser(observations);
  const snapshotPath = prepareSnapshot({ projectName: testInfo.project.name, state: "error" });
  await page.screenshot({ path: snapshotPath, fullPage: false });
  expect(readPngDimensions(snapshotPath)).toEqual({ width: 1440, height: 900 });
});

test("Enter en búsqueda filtra sin recargar ni cambiar la URL", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();
  let mainFrameNavigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) mainFrameNavigations += 1;
  });

  const search = page.getByLabel("Buscar señales");
  await search.fill("agentes");
  await search.press("Enter");

  await expect(page).toHaveURL(`${APP_ORIGIN}/`);
  await expect(page.locator("[data-signal-id]:visible", { hasText: "AISI y OpenAI detallan incidentes de agentes en pruebas cyber" })).toHaveCount(1);
  expect(mainFrameNavigations).toBe(0);
});

test("los controles principales reciben foco visible por teclado", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "AI Radar, inicio" })).toBeFocused();
  await expect(page.getByRole("link", { name: "AI Radar, inicio" })).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Buscar señales")).toBeFocused();
  await expect(page.getByLabel("Buscar señales")).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Modo lector" })).toBeFocused();
});

test("el viewport no presenta overflow horizontal", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();
  const searchLabel = page.locator('label[for="search-input"]');
  await expect(searchLabel).toBeVisible();
  const labelBox = await searchLabel.boundingBox();
  expect(labelBox.width).toBeGreaterThan(40);
  expect(labelBox.height).toBeGreaterThan(10);
  await expectNoHorizontalOverflow(page);
});

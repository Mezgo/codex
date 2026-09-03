const { test, expect } = require("@playwright/test");
const { prepareSnapshot } = require("./snapshot-artifacts.js");

const APP_ORIGIN = "http://127.0.0.1:4173";
const FIXTURE_PATH = "/data/fixtures/daily-signals/2026-08-04.json";

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
}

function expectCleanBrowser(observations) {
  expect(observations.consoleMessages, "advertencias o errores de consola").toEqual([]);
  expect(observations.pageErrors, "errores JavaScript no controlados").toEqual([]);
  expect(observations.failedRequests, "solicitudes de red fallidas").toEqual([]);
  expect(observations.unexpectedResponses, "respuestas HTTP inesperadas").toEqual([]);
  expect(observations.unexpectedOrigins, "solicitudes fuera del servidor local").toEqual([]);
}

test("carga el fixture declarado, busca y conserva navegador limpio", async ({ page }, testInfo) => {
  const observations = observeBrowser(page);
  const fixtureResponse = page.waitForResponse((response) => response.url() === `${APP_ORIGIN}${FIXTURE_PATH}`);

  await page.goto("/");
  expect((await fixtureResponse).status()).toBe(200);
  await expect(page.getByText(/Demo local.*fixture 2026-08-04/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ranking de señales" })).toBeVisible();
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();

  await page.getByLabel("Buscar señales").fill("agentes");
  await expect(page.locator("[data-signal-id]:visible", { hasText: "AISI y OpenAI detallan incidentes de agentes en pruebas cyber" })).toHaveCount(1);
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();

  await expectNoHorizontalOverflow(page);
  expectCleanBrowser(observations);

  const snapshotPath = prepareSnapshot({ projectName: testInfo.project.name, state: "success" });
  await page.screenshot({ path: snapshotPath, fullPage: true });
});

test("combina filtros de fuente y fecha", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();

  await page.getByLabel("Fuente").selectOption({ label: "Comision Europea" });
  await expect(page.getByText("No encontramos señales")).toBeVisible();
  await page.getByLabel("Fecha").selectOption("all");
  await expect(page.locator("[data-signal-id]:visible", { hasText: "La Comision Europea publica guias de transparencia del AI Act" })).toHaveCount(1);
  await expect(page.locator("[data-signal-id]")).toHaveCount(2);
});

test("muestra vacío y permite limpiar filtros", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Buscar señales").fill("resultado-inexistente-xyz");
  await expect(page.getByText("No encontramos señales")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).last().click();
  await expect(page.locator("[data-signal-id]:visible").first()).toBeVisible();
  await expect(page.getByLabel("Buscar señales")).toHaveValue("");
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
  await expectNoHorizontalOverflow(page);
  expectCleanBrowser(observations);
  const snapshotPath = prepareSnapshot({ projectName: testInfo.project.name, state: "error" });
  await page.screenshot({ path: snapshotPath, fullPage: true });
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
  await expectNoHorizontalOverflow(page);
});

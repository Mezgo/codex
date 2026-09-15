import test from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_URL, loadSignals } from "../../src/data/load-signals.mjs";

test("loadSignals declara la procedencia del fixture", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ generatedAt: "2026-08-05T00:15:06Z", signals: [] })
  });

  const result = await loadSignals(fetchImpl);

  assert.equal(FIXTURE_URL, "/data/fixtures/daily-signals/2026-08-04.json");
  assert.equal(result.provenance.kind, "fixture");
  assert.equal(result.provenance.path, FIXTURE_URL);
  assert.equal(result.provenance.generatedAt, "2026-08-05T00:15:06Z");
});

test("loadSignals traduce una respuesta HTTP fallida", async () => {
  const fetchImpl = async () => ({ ok: false, status: 404 });

  await assert.rejects(() => loadSignals(fetchImpl), /No se pudo cargar el fixture \(404\)/);
});

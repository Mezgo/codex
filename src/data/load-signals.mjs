export const FIXTURE_URL = "/data/fixtures/daily-signals/2026-08-04.json";

export async function loadSignals(fetchImpl = fetch, url = FIXTURE_URL) {
  const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`No se pudo cargar el fixture (${response.status})`);
  }

  const payload = await response.json();
  return {
    payload,
    provenance: {
      kind: "fixture",
      path: url,
      generatedAt: payload.generatedAt || "Sin dato"
    }
  };
}

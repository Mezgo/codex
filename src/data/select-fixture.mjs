import { FIXTURE_URL } from "./load-signals.mjs";

export const MISSING_FIXTURE_URL = "/data/fixtures/daily-signals/missing.json";

export function selectFixtureUrl(search = "") {
  const fixture = new URLSearchParams(search).get("fixture");
  return fixture === "missing" ? MISSING_FIXTURE_URL : FIXTURE_URL;
}

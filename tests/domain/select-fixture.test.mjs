import test from "node:test";
import assert from "node:assert/strict";
import { selectFixtureUrl, MISSING_FIXTURE_URL } from "../../src/data/select-fixture.mjs";
import { FIXTURE_URL } from "../../src/data/load-signals.mjs";

test("selectFixtureUrl permite solo el fixture missing conocido", () => {
  assert.equal(selectFixtureUrl("?fixture=missing"), MISSING_FIXTURE_URL);
});

test("selectFixtureUrl rechaza URLs arbitrarias y conserva el fixture declarado", () => {
  assert.equal(selectFixtureUrl("?fixture=https%3A%2F%2Fevil.example%2Fpwn.json"), FIXTURE_URL);
  assert.equal(selectFixtureUrl("?fixture=%2Fetc%2Fpasswd"), FIXTURE_URL);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import snapshotArtifacts from "./snapshot-artifacts.js";

const { prepareSnapshot } = snapshotArtifacts;

test("prepareSnapshot elimina el artefacto anterior antes de devolver su ruta", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-radar-snapshot-"));
  try {
    const expected = path.join(root, "ai-radar-mobile-success.png");
    fs.writeFileSync(expected, "captura-anterior");

    const actual = prepareSnapshot({ projectName: "mobile", state: "success", root });

    assert.equal(actual, expected);
    assert.equal(fs.existsSync(expected), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("prepareSnapshot rechaza proyectos o estados fuera de la lista permitida", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-radar-snapshot-"));
  try {
    const protectedFile = path.join(root, "protected.png");
    fs.writeFileSync(protectedFile, "conservar");

    assert.throws(
      () => prepareSnapshot({ projectName: "../mobile", state: "success", root }),
      /Captura no permitida/
    );
    assert.throws(
      () => prepareSnapshot({ projectName: "mobile", state: "error", root }),
      /Captura no permitida/
    );
    assert.equal(fs.readFileSync(protectedFile, "utf8"), "conservar");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

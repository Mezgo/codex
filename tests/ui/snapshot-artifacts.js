const fs = require("node:fs");
const path = require("node:path");

const snapshotNames = new Map([
  ["desktop:success", "ai-radar-desktop-success.png"],
  ["mobile:success", "ai-radar-mobile-success.png"],
  ["desktop:error", "ai-radar-desktop-error.png"]
]);

function prepareSnapshot({ projectName, state, root = "snapshots" }) {
  const name = snapshotNames.get(`${projectName}:${state}`);
  if (!name) throw new Error(`Captura no permitida: ${projectName}:${state}`);
  const snapshotRoot = path.resolve(root);
  const snapshotPath = path.join(snapshotRoot, name);
  fs.mkdirSync(snapshotRoot, { recursive: true });
  fs.rmSync(snapshotPath, { force: true });
  return snapshotPath;
}

module.exports = { prepareSnapshot };

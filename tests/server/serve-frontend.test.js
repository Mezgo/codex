const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
let child;
let origin;

before(async () => {
  const port = await reservePort();
  origin = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["scripts/serve-frontend.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) }
  });
  await waitForServer(child, origin);
});

after(() => child?.kill());

test("el servidor entrega el fixture diario", async () => {
  const response = await fetch(`${origin}/data/fixtures/daily-signals/2026-08-04.json`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(payload.generatedAt, "2026-08-05T00:15:06Z");
});

test("el servidor no expone archivos fuera de los recursos públicos", async () => {
  const response = await fetch(`${origin}/package.json`);

  assert.equal(response.status, 404);
});

test("el servidor no expone el código de servidor", async () => {
  const response = await fetch(`${origin}/src/server/env.js`);

  assert.equal(response.status, 404);
});

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function waitForServer(process, serverOrigin) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("El servidor no inició")), 2_000);
    process.once("error", reject);
    process.once("exit", (code) => reject(new Error(`El servidor terminó (${code})`)));
    process.stdout.on("data", () => {
      clearTimeout(timeout);
      resolve(serverOrigin);
    });
  });
}

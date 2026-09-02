const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const frontendRoot = path.join(root, "src");
const serverRoot = path.join(frontendRoot, "server");
const fixturePath = path.join(root, "data", "fixtures", "daily-signals", "2026-08-04.json");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const requested = pathname === "/" ? "/src/index.html" : pathname;
  const filePath = path.resolve(root, `.${requested}`);

  if (!isPublicFile(filePath)) {
    return end(response, 404, "Not found");
  }

  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(body);
  } catch (error) {
    end(response, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : "Server error");
  }
}).listen(port, "127.0.0.1", () => console.log(`AI Radar: http://127.0.0.1:${port}`));

function isPublicFile(filePath) {
  const isFrontendAsset = filePath.startsWith(`${frontendRoot}${path.sep}`);
  const isServerCode = filePath.startsWith(`${serverRoot}${path.sep}`);
  return (isFrontendAsset && !isServerCode) || filePath === fixturePath;
}

function end(response, status, message) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

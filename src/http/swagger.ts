import { createReadStream, existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, normalize } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const SWAGGER_DIST = dirname(require.resolve("swagger-ui-dist/package.json"));

const STATIC_ALLOW = new Set([
  "swagger-ui-bundle.js",
  "swagger-ui-standalone-preset.js",
  "swagger-ui.css",
  "swagger-ui-bundle.js.map",
  "swagger-ui-standalone-preset.js.map",
  "swagger-ui.css.map",
  "favicon-32x32.png",
  "favicon-16x16.png",
  "index.css"
]);

const MIME: Record<string, string> = {
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png"
};

function openapiPath(): string {
  return join(process.cwd(), "contracts", "openapi.yaml");
}

function swaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TCMS API — Swagger</title>
  <link rel="stylesheet" href="/api-docs/static/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api-docs/static/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="/api-docs/static/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/openapi.yaml",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
}

/**
 * Handle OpenAPI spec, Swagger UI, and static swagger-ui-dist assets. Returns true if handled.
 */
export function tryServeSwagger(req: IncomingMessage, res: ServerResponse): boolean {
  const raw = req.url?.split("?")[0] ?? "";
  const url = raw.endsWith("/") && raw.length > 1 ? raw.slice(0, -1) : raw;

  if (url === "/openapi.yaml" && req.method === "GET") {
    const p = openapiPath();
    if (!existsSync(p)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("openapi.yaml not found. Expected at contracts/openapi.yaml");
      return true;
    }
    res.writeHead(200, { "Content-Type": "application/yaml; charset=utf-8" });
    createReadStream(p).pipe(res);
    return true;
  }

  if ((url === "/api-docs" || url === "/swagger") && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(swaggerHtml());
    return true;
  }

  if (url.startsWith("/api-docs/static/") && req.method === "GET") {
    const name = basename(normalize(url.replace("/api-docs/static/", "")));
    if (!STATIC_ALLOW.has(name)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return true;
    }
    const filePath = join(SWAGGER_DIST, name);
    const resolved = normalize(filePath);
    if (!resolved.startsWith(normalize(SWAGGER_DIST))) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return true;
    }
    if (!existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return true;
    }
    const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";
    const ct = MIME[ext] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": ct });
    res.end(readFileSync(filePath));
    return true;
  }

  return false;
}

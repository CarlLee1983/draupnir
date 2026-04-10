/**
 * Gravito Docs Adapter
 *
 * Responsibilities:
 * 1. Provide OpenAPI JSON endpoint (GET /api/openapi.json).
 * 2. Provide Swagger UI endpoint (GET /api/docs).
 * 3. Parse OpenAPI specifications from YAML files.
 *
 * Architecture Highlights:
 * - Framework Agnostic: Depends only on PlanetCore and standard Node.js APIs.
 * - Simplified: Doesn't use external Swagger UI packages; uses CDN instead.
 */

import type { PlanetCore } from '@gravito/core'

/**
 * Builds Swagger UI HTML.
 * Uses Swagger UI CDN, no additional packages required.
 *
 * @returns HTML string to be returned by the framework.
 */
function buildSwaggerUI(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Gravito API - Swagger UI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; padding:0; }
    h1, h2, h3 { margin: 10px 0; }
    .topbar { background-color: #fafafa; padding: 10px 0; border-bottom: 1px solid #ddd; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
      })
    }
  </script>
</body>
</html>
	`.trim()
}

/**
 * Registers documentation routes with Gravito.
 *
 * Establishes two endpoints:
 * 1. GET /api/docs - Swagger UI (HTML).
 * 2. GET /api/openapi.json - OpenAPI JSON Specification.
 *
 * @param core - Gravito core instance.
 */
export async function registerDocsWithGravito(core: PlanetCore): Promise<void> {
  // Cache the parsed OpenAPI YAML result to avoid redundant reads
  let cachedOpenAPIJSON: Record<string, unknown> | null = null

  // GET /api/docs - Return Swagger UI HTML
  core.router.get('/api/docs', (ctx) => {
    ctx.header('Content-Type', 'text/html; charset=utf-8')
    return ctx.html(buildSwaggerUI())
  })

  // GET /api/openapi.json - Return OpenAPI specification (JSON)
  core.router.get('/api/openapi.json', async (ctx) => {
    if (cachedOpenAPIJSON === null) {
      const yamlText = await Bun.file('docs/openapi.yaml').text()
      const { parse } = await import('yaml')
      cachedOpenAPIJSON = parse(yamlText)
    }

    return ctx.json(cachedOpenAPIJSON)
  })

  console.log('✅ Docs routes registered: /api/docs, /api/openapi.json')
}


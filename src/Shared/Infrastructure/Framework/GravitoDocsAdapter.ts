/**
 * Gravito 文檔適配器 (Gravito Docs Adapter)
 *
 * 負責：
 * 1. 提供 OpenAPI JSON 端點（GET /api/openapi.json）
 * 2. 提供 Swagger UI 端點（GET /api/docs）
 * 3. 從 YAML 檔案解析 OpenAPI 規範
 *
 * 架構特點：
 * - 框架無關性：只依賴 PlanetCore 和標準 Node.js API
 * - 簡化：不使用外部 Swagger UI 套件，改用 CDN
 */

import type { PlanetCore } from '@gravito/core'

/**
 * 建構 Swagger UI HTML
 * 使用 Swagger UI CDN，無需額外套件
 *
 * @returns HTML 字串，可直接由框架回傳
 */
function buildSwaggerUI(): string {
	return `
<!DOCTYPE html>
<html lang="zh-Hant">
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
 * 註冊文檔路由到 Gravito
 *
 * 建立兩個端點：
 * 1. GET /api/docs - Swagger UI（HTML）
 * 2. GET /api/openapi.json - OpenAPI JSON 規範
 *
 * @param core Gravito 核心實例
 */
export async function registerDocsWithGravito(core: PlanetCore): Promise<void> {
	// 快取 OpenAPI YAML 的解析結果，避免重複讀取
	let cachedOpenAPIJSON: Record<string, unknown> | null = null

	// GET /api/docs - 回傳 Swagger UI HTML
	core.router.get('/api/docs', (ctx) => {
		ctx.header('Content-Type', 'text/html; charset=utf-8')
		return ctx.html(buildSwaggerUI())
	})

	// GET /api/openapi.json - 回傳 OpenAPI 規範（JSON）
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

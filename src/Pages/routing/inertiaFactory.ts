/**
 * Factory for `InertiaService`: chooses dev-server vs built asset tags and Inertia asset version.
 */
import { readFileSync } from 'node:fs'

import { InertiaService } from '../InertiaService'
import { type ViteManifest, ViteTagHelper } from '../ViteTagHelper'

import { joinPath } from './pathUtils'

function loadViteManifest(): ViteManifest | undefined {
  const root = process.cwd()
  const candidates = [
    joinPath(root, 'public/build/.vite/manifest.json'),
    joinPath(root, 'public/build/manifest.json'),
  ]
  for (const p of candidates) {
    const m = ViteTagHelper.loadManifest(p)
    if (m) return m
  }
  return undefined
}

/**
 * @returns True when the server should load hashed assets from `public/build` (production or
 *   `SERVE_VITE_BUILD=true`).
 */
export function useBuiltFrontendAssets(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.SERVE_VITE_BUILD === 'true'
}

/**
 * Constructs a configured `InertiaService` using `NODE_ENV`, `VITE_DEV_SERVER`, and optional manifest.
 *
 * @returns Ready-to-register singleton for `PAGE_CONTAINER_KEYS.inertiaService`.
 */
export function createInertiaService(): InertiaService {
  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const devServerUrl = process.env.VITE_DEV_SERVER ?? 'http://localhost:5173'
  const useBuild = useBuiltFrontendAssets()

  let manifest: ViteManifest | undefined
  if (useBuild) {
    manifest = loadViteManifest()
    if (!manifest) {
      console.warn('⚠️ Vite manifest not found — run "bun run build:frontend"')
    }
  }

  const tagEnv = useBuild ? 'production' : nodeEnv
  const viteHelper = new ViteTagHelper(tagEnv, devServerUrl, manifest)
  const viteTags = viteHelper.generateTags(['resources/js/app.tsx', 'resources/css/app.css'])

  const viewDir = joinPath(process.cwd(), 'src/views')
  const templateContent = readFileSync(joinPath(viewDir, 'app.html'), 'utf-8')

  const renderTemplate = (data: Record<string, unknown>): string => {
    let html = templateContent
    html = html.replace(/\{\{\{\s*viteTags\s*\}\}\}/g, data.viteTags as string)
    html = html.replace(/\{\{\{\s*page\s*\}\}\}/g, data.page as string)
    return html
  }

  const version =
    useBuild && manifest
      ? Object.values(manifest)
          .map((e) => e.file)
          .join(',')
          .slice(0, 16)
      : 'dev'

  return new InertiaService(renderTemplate, viteTags, version)
}

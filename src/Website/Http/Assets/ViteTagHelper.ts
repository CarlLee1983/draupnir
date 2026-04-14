/** Single Vite manifest record (hashed output file plus optional CSS chunks). */
export interface ViteManifestEntry {
  file: string
  css?: string[]
  imports?: string[]
}

export type ViteManifest = Record<string, ViteManifestEntry>

/**
 * Builds `<script>` / `<link>` tags for Vite entrypoints in development (dev server) or production
 * (hashed paths under `/build/` from manifest).
 */
export class ViteTagHelper {
  constructor(
    private readonly env: string,
    private readonly devServerUrl: string,
    private readonly manifest?: ViteManifest,
    /**
     * Must match Vite **dev** `base` (repo default: `''` when `vite serve` uses `base: '/'`).
     * Override with `VITE_DEV_BASE_PATH` if your dev server uses another prefix (e.g. `/build/`).
     */
    private readonly viteDevBasePath: string = '',
  ) {}

  /**
   * @param entrypoints - Manifest keys such as `resources/js/app.tsx` (production) or dev paths.
   * @returns Concatenated HTML tags for injection into `app.html`.
   * @throws {Error} When `env` is production and manifest is missing or incomplete for an entry.
   */
  generateTags(entrypoints: string[]): string {
    if (this.env === 'production') {
      return this.productionTags(entrypoints)
    }
    return this.developmentTags(entrypoints)
  }

  /** Full URL for a path under the Vite dev server, respecting dev `base` prefix. */
  private devServerModuleUrl(path: string): string {
    const origin = this.devServerUrl.replace(/\/$/, '')
    const base = this.viteDevBasePath.replace(/^\/+|\/+$/g, '')
    const rel = path.startsWith('/') ? path : `/${path}`
    const prefix = base ? `/${base}` : ''
    return `${origin}${prefix}${rel}`
  }

  private developmentTags(entrypoints: string[]): string {
    const tags: string[] = [
      `<script type="module" src="${this.devServerModuleUrl('/@vite/client')}"></script>`,
    ]
    for (const entry of entrypoints) {
      if (entry.endsWith('.css')) {
        tags.push(`<link rel="stylesheet" href="${this.devServerModuleUrl(entry)}">`)
      } else {
        tags.push(`<script type="module" src="${this.devServerModuleUrl(entry)}"></script>`)
      }
    }
    return tags.join('\n    ')
  }

  private productionTags(entrypoints: string[]): string {
    if (!this.manifest) {
      throw new Error('Vite manifest not found. Run "bun run build:frontend" first.')
    }
    const cssSet = new Set<string>()
    const jsTags: string[] = []

    for (const entry of entrypoints) {
      const manifestEntry = this.manifest[entry]
      if (!manifestEntry) continue

      if (manifestEntry.file.endsWith('.css')) {
        cssSet.add(manifestEntry.file)
      } else {
        jsTags.push(`<script type="module" src="/build/${manifestEntry.file}"></script>`)
        if (manifestEntry.css) {
          for (const css of manifestEntry.css) {
            cssSet.add(css)
          }
        }
      }
    }

    const cssTags = [...cssSet].map((f) => `<link rel="stylesheet" href="/build/${f}">`)
    return [...cssTags, ...jsTags].join('\n    ')
  }

  /**
   * @param manifestPath - Absolute path to `manifest.json` under `public/build`.
   * @returns Parsed manifest, or `undefined` if the file is missing or invalid JSON.
   */
  static async loadManifest(manifestPath: string): Promise<ViteManifest | undefined> {
    try {
      return (await Bun.file(manifestPath).json()) as ViteManifest
    } catch {
      return undefined
    }
  }
}

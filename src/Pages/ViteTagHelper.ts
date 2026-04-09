import { readFileSync } from 'node:fs'

export interface ViteManifestEntry {
  file: string
  css?: string[]
  imports?: string[]
}

export type ViteManifest = Record<string, ViteManifestEntry>

export class ViteTagHelper {
  constructor(
    private readonly env: string,
    private readonly devServerUrl: string,
    private readonly manifest?: ViteManifest,
  ) {}

  generateTags(entrypoints: string[]): string {
    if (this.env === 'production') {
      return this.productionTags(entrypoints)
    }
    return this.developmentTags(entrypoints)
  }

  private developmentTags(entrypoints: string[]): string {
    const tags: string[] = [
      `<script type="module" src="${this.devServerUrl}/@vite/client"></script>`,
    ]
    for (const entry of entrypoints) {
      if (entry.endsWith('.css')) {
        tags.push(`<link rel="stylesheet" href="${this.devServerUrl}/${entry}">`)
      } else {
        tags.push(`<script type="module" src="${this.devServerUrl}/${entry}"></script>`)
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

  static loadManifest(manifestPath: string): ViteManifest | undefined {
    try {
      const raw = readFileSync(manifestPath, 'utf-8')
      return JSON.parse(raw) as ViteManifest
    } catch {
      return undefined
    }
  }
}

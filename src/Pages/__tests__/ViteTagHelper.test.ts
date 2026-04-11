import { afterEach, describe, expect, test } from 'bun:test'
import { joinPath } from '../routing/pathUtils'
import { ViteTagHelper } from '../ViteTagHelper'

describe('ViteTagHelper', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  test('development mode returns Vite dev server tags', () => {
    const helper = new ViteTagHelper('development', 'http://localhost:5173')
    const tags = helper.generateTags(['resources/js/app.tsx', 'resources/css/app.css'])
    expect(tags).toContain(
      '<script type="module" src="http://localhost:5173/@vite/client"></script>',
    )
    expect(tags).toContain(
      '<script type="module" src="http://localhost:5173/resources/js/app.tsx"></script>',
    )
    expect(tags).toContain(
      '<link rel="stylesheet" href="http://localhost:5173/resources/css/app.css">',
    )
  })

  test('development mode respects custom dev base prefix', () => {
    const helper = new ViteTagHelper('development', 'http://localhost:5173', undefined, 'build')
    const tags = helper.generateTags(['resources/js/app.tsx'])
    expect(tags).toContain(
      '<script type="module" src="http://localhost:5173/build/@vite/client"></script>',
    )
  })

  test('production mode reads manifest and returns hashed tags', () => {
    const manifest = {
      'resources/js/app.tsx': { file: 'assets/app-abc123.js', css: ['assets/app-def456.css'] },
      'resources/css/app.css': { file: 'assets/app-def456.css' },
    }
    const helper = new ViteTagHelper('production', '', manifest)
    const tags = helper.generateTags(['resources/js/app.tsx', 'resources/css/app.css'])
    expect(tags).toContain('<script type="module" src="/build/assets/app-abc123.js"></script>')
    expect(tags).toContain('<link rel="stylesheet" href="/build/assets/app-def456.css">')
  })

  test('production mode without manifest throws', () => {
    const helper = new ViteTagHelper('production', '')
    expect(() => helper.generateTags(['resources/js/app.tsx'])).toThrow()
  })

  test('loadManifest parses manifest JSON from disk', async () => {
    const path = joinPath(import.meta.dir, 'fixtures', 'minimal-vite-manifest.json')
    const m = await ViteTagHelper.loadManifest(path)
    expect(m?.['resources/js/app.tsx']?.file).toBe('assets/app-abc123.js')
  })

  test('loadManifest returns undefined for missing file', async () => {
    const m = await ViteTagHelper.loadManifest(joinPath(import.meta.dir, 'fixtures', 'nope.json'))
    expect(m).toBeUndefined()
  })
})

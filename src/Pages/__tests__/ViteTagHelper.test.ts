import { describe, test, expect, afterEach } from 'bun:test'
import { ViteTagHelper } from '../ViteTagHelper'

describe('ViteTagHelper', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  test('development mode returns Vite dev server tags', () => {
    const helper = new ViteTagHelper('development', 'http://localhost:5173')
    const tags = helper.generateTags(['resources/js/app.tsx', 'resources/css/app.css'])
    expect(tags).toContain('<script type="module" src="http://localhost:5173/@vite/client"></script>')
    expect(tags).toContain('<script type="module" src="http://localhost:5173/resources/js/app.tsx"></script>')
    expect(tags).toContain('<link rel="stylesheet" href="http://localhost:5173/resources/css/app.css">')
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
})

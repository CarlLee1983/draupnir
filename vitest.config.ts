import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const rootDir = dirname(fileURLToPath(import.meta.url))
const importRoots = [resolve(rootDir, 'resources/js'), resolve(rootDir, 'src')]
const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']
const indexFiles = [
  'index.ts',
  'index.tsx',
  'index.js',
  'index.jsx',
  'index.mts',
  'index.mjs',
]

function resolveWorkspaceImport(source: string): string | null {
  if (!source.startsWith('@/')) return null

  const relativePath = source.slice(2)

  for (const root of importRoots) {
    const basePath = resolve(root, relativePath)

    for (const extension of extensions) {
      const candidate = `${basePath}${extension}`
      if (existsSync(candidate) && !candidate.endsWith('/')) {
        return candidate
      }
    }

    for (const indexFile of indexFiles) {
      const candidate = resolve(basePath, indexFile)
      if (existsSync(candidate)) {
        return candidate
      }
    }
  }

  return null
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'workspace-at-alias',
      enforce: 'pre',
      resolveId(source) {
        return resolveWorkspaceImport(source)
      },
    },
  ],
  test: {
    environment: 'node',
    globals: true,
  },
})

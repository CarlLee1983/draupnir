import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

const vitePort = Number(process.env.VITE_PORT ?? 5173)
const viteDevOrigin = process.env.VITE_ORIGIN ?? `http://localhost:${vitePort}`

/**
 * Dev uses `base: '/'` so `/@react-refresh` matches @vitejs/plugin-react preamble imports.
 * Build keeps `base: '/build/'` so hashed assets align with Bun/Inertia production tags.
 */
export default defineConfig(({ command }) => ({
  plugins: [react()],
  root: '.',
  base: command === 'build' ? '/build/' : '/',
  resolve: {
    alias: {
      '@': resolve(rootDir, 'resources/js'),
    },
  },
  build: {
    outDir: 'public/build',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        app: resolve(rootDir, 'resources/js/app.tsx'),
        css: resolve(rootDir, 'resources/css/app.css'),
      },
    },
  },
  server: {
    port: vitePort,
    strictPort: true,
    origin: viteDevOrigin,
  },
}))

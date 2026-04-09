import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/build/',
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
    port: 5173,
    strictPort: true,
    origin: 'http://localhost:5173',
  },
})

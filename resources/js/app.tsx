import '@vitejs/plugin-react/preamble'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import type { ComponentType } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { attachInertiaCsrfHeaders } from '@/inertiaCsrf'
import '../css/app.css'

attachInertiaCsrfHeaders()

createInertiaApp({
  title: (title) => (title ? `${title} — Draupnir` : 'Draupnir'),
  resolve: async (name) => {
    // Do not use `eager: true`: Vite hoists eager glob imports above this file's preamble,
    // so React refresh runs in page chunks before `window.$RefreshReg$` exists.
    const pages = import.meta.glob<{ default: ComponentType<Record<string, unknown>> }>(
      './Pages/**/*.tsx',
    )
    const load = pages[`./Pages/${name}.tsx`]
    if (!load) {
      throw new Error(`Page not found: ${name}`)
    }
    const page = await load()
    if (!page?.default) {
      throw new Error(`Page not found: ${name}`)
    }
    return page.default
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <>
        <App {...props} />
        <Toaster />
      </>,
    )
  },
})

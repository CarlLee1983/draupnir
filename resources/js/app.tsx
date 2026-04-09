import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import type { ComponentType } from 'react'
import '../css/app.css'

createInertiaApp({
  title: (title) => (title ? `${title} — Draupnir` : 'Draupnir'),
  resolve: (name) => {
    const pages = import.meta.glob<{ default: ComponentType<Record<string, unknown>> }>(
      './Pages/**/*.tsx',
      { eager: true },
    )
    const page = pages[`./Pages/${name}.tsx`]
    if (!page?.default) {
      throw new Error(`Page not found: ${name}`)
    }
    return page
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})

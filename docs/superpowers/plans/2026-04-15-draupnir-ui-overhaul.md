# Draupnir UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul Draupnir's UI/UX using the "Midnight Bloom / Cleaner Lines" design system, moving from a generic look to a technical, premium, functional-contrast aesthetic.

**Architecture:** 
1. Update global theme tokens (Tailwind & CSS).
2. Refactor core layouts (AppShell, Sidebar, TopBar) to support the new dark-technical aesthetic.
3. Completely redesign the main Member Dashboard to use a Geometric Grid and high-density KPI layout.

**Tech Stack:** React, Tailwind CSS, Inertia.js, Geist Sans/Mono fonts.

---

### Task 1: Design System Foundation (Fonts & Colors)

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `resources/css/app.css`

- [ ] **Step 1: Install Geist fonts**
Run: `bun add geist`
Expected: `package.json` updated with `geist`.

- [ ] **Step 2: Update Tailwind Config with new tokens**
Modify `tailwind.config.ts` to include Geist fonts and the new "Midnight Bloom" palette.

```typescript
import type { Config } from 'tailwindcss'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

const config: Config = {
  darkMode: 'class',
  content: ['./resources/js/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#6366f1', // Indigo-500
          foreground: '#ffffff',
        },
        // Midnight Bloom Palette
        zinc: {
          950: '#09090b',
          800: '#27272a',
        },
      },
    },
  },
}
export default config
```

- [ ] **Step 3: Refine CSS base layer**
Update `resources/css/app.css` to set the new dark defaults.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --border: 240 5.9% 90%;
    /* ... keep other light mode vars ... */
  }

  .dark {
    --background: 240 10% 3.9%; /* #09090b */
    --foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%; /* #27272a */
    --card: 240 10% 3.9%;
    --popover: 240 10% 3.9%;
  }
}

@layer base {
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

- [ ] **Step 4: Commit foundation changes**
Run: `git add tailwind.config.ts resources/css/app.css package.json && git commit -m "feat: setup design system foundation (Geist fonts, Midnight Bloom colors)"`

---

### Task 2: Dark-Technical Layout Overhaul

**Files:**
- Modify: `resources/js/components/layout/Sidebar.tsx`
- Modify: `resources/js/components/layout/TopBar.tsx`
- Modify: `resources/js/components/layout/AppShell.tsx`

- [ ] **Step 1: Update Sidebar to new aesthetic**
Modify `Sidebar.tsx` to use `#09090b` background, sharp borders, and Geist Mono for labels.

- [ ] **Step 2: Update TopBar to new aesthetic**
Modify `TopBar.tsx` to ensure it matches the new border style and has a cleaner, higher-contrast profile menu.

- [ ] **Step 3: Verify Layout consistency**
Check that the layout remains responsive and the navigation items are clearly visible.

- [ ] **Step 4: Commit layout changes**
Run: `git add resources/js/components/layout/ && git commit -m "feat: overhaul global layout with dark-technical aesthetic"`

---

### Task 3: Geometric Grid & MetricCard Redesign

**Files:**
- Create: `resources/js/Pages/Member/Dashboard/components/MetricGrid.tsx`
- Modify: `resources/js/Pages/Member/Dashboard/Index.tsx`

- [ ] **Step 1: Create the Geometric Grid component**
This component will provide the structured 1px border layout.

```tsx
import { ReactNode } from 'react'

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl shadow-indigo-500/10">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Redesign MetricCard for the grid**
Update the internal `MetricCard` in `Index.tsx` (or extract it) to fit the new design: no individual card borders, top accent gradient, Geist Mono labels.

- [ ] **Step 3: Update Dashboard Index to use MetricGrid**
Refactor the KPI section in `resources/js/Pages/Member/Dashboard/Index.tsx`.

- [ ] **Step 4: Commit Dashboard components**
Run: `git add resources/js/Pages/Member/Dashboard/ && git commit -m "feat: implement Geometric Grid and redesigned MetricCards"`

---

### Task 4: Usage Timeline & Chart Polish

**Files:**
- Modify: `resources/js/components/charts/CostTrendAreaChart.tsx`
- Modify: `resources/js/Pages/Member/Dashboard/Index.tsx`

- [ ] **Step 1: Sharpen Chart visuals**
Update `CostTrendAreaChart.tsx` to use the new Indigo/Cyan palette, reduce area opacity, and add sharp grid lines.

- [ ] **Step 2: Update Timeline container in Dashboard**
Ensure the chart container matches the "Cleaner Lines" aesthetic (8px radius, `#27272a` border).

- [ ] **Step 3: Commit chart refinements**
Run: `git add resources/js/components/charts/ resources/js/Pages/Member/Dashboard/Index.tsx && git commit -m "feat: polish charts and timeline container for technical clarity"`

---

### Task 5: Final Verification & Smoke Test

- [ ] **Step 1: Run Smoke Tests**
Run: `npm run test:e2e:smoke`
Expected: PASS.

- [ ] **Step 2: Visual Audit**
Manually verify the Dashboard and navigation in the browser.
Checklist:
- [ ] No layout shifts.
- [ ] Contrast is high (readable text).
- [ ] Geist fonts are loading correctly.
- [ ] Borders align perfectly in the Geometric Grid.

- [ ] **Step 3: Commit final polish**
Run: `git commit --allow-empty -m "chore: final visual verification of UI overhaul"`

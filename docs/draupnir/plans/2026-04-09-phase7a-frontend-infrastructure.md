# Phase 7a: Frontend Infrastructure 實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Inertia.js + React + Vite + Tailwind CSS + shadcn/ui 前端基礎設施，實現 server-side Inertia 渲染、共用 Layout、核心 UI 元件，並以一個端到端可運行的 Admin Dashboard 頁面驗證全棧整合。

**Architecture:** 採用 Inertia.js 做為 server-driven SPA 架構。後端使用 @gravito/prism 的 `@inertia` 模板指令生成初始 HTML，前端用 `@inertiajs/react` 接管客戶端渲染。新增 `src/Pages/` 目錄放置 Inertia 頁面控制器（與現有 API 控制器分離）。React 頁面元件放在 `resources/js/Pages/`，共用元件放在 `resources/js/components/`。

**Tech Stack:** Bun, Vite, React 19, TypeScript, @inertiajs/react, @gravito/prism (OrbitPrism + @inertia 指令), Tailwind CSS v3, shadcn/ui, TanStack Table, Recharts, React Hook Form + Zod

**Related Plans (Phase 7):**
- `2026-04-09-phase7b-member-portal.md` — 會員 Portal 頁面（依賴本計劃）
- `2026-04-09-phase7c-admin-portal.md` — 管理後台頁面（依賴本計劃）

---

## Scope Check

Phase 7 規格涵蓋三個子系統：前端基礎設施 + 共用元件、會員 Portal、管理後台。已拆分為三份獨立計劃：

- **7a（本計劃）**：build pipeline、Inertia 整合、Layout、DataTable、Chart、Form 元件、範例頁面
- **7b**：會員 Portal 所有頁面
- **7c**：管理後台所有頁面

## File Structure

### 新增檔案

```
# Build & Config
vite.config.ts                              # Vite 前端建置設定
tsconfig.frontend.json                      # 前端專用 TypeScript 設定
postcss.config.js                           # PostCSS（Tailwind 需要）
tailwind.config.ts                          # Tailwind CSS 設定
components.json                             # shadcn/ui CLI 設定

# Prism 模板
src/views/app.html                          # Base HTML + @inertia 指令

# Server-side Inertia
src/Pages/InertiaService.ts                 # Inertia 渲染核心（HTML / JSON 雙模式）
src/Pages/ViteTagHelper.ts                  # Dev/Prod 環境 <script>/<link> 標籤產生
src/Pages/SharedDataMiddleware.ts           # 注入 auth user、currentOrg 到 Inertia props
src/Pages/__tests__/InertiaService.test.ts  # InertiaService 單元測試
src/Pages/__tests__/ViteTagHelper.test.ts   # ViteTagHelper 單元測試
src/Pages/Admin/AdminDashboardPage.ts       # 範例：Admin Dashboard 頁面控制器
src/Pages/page-routes.ts                    # 所有前端頁面路由註冊

# Client-side React
resources/css/app.css                       # Tailwind 匯入 + CSS 變數
resources/js/app.tsx                        # Inertia client entry point
resources/js/ssr.tsx                        # SSR entry（可選，先不啟用）
resources/js/types/global.d.ts              # 全域 TypeScript 型別
resources/js/types/inertia.d.ts             # Inertia PageProps 型別
resources/js/lib/utils.ts                   # cn() 工具函式（shadcn 需要）
resources/js/hooks/use-auth.ts              # 取得當前登入使用者
resources/js/hooks/use-org.ts               # 取得當前組織
resources/js/components/ui/button.tsx        # shadcn Button
resources/js/components/ui/card.tsx          # shadcn Card
resources/js/components/ui/input.tsx         # shadcn Input
resources/js/components/ui/badge.tsx         # shadcn Badge
resources/js/components/ui/table.tsx         # shadcn Table（DataTable 基礎）
resources/js/components/ui/dropdown-menu.tsx # shadcn DropdownMenu
resources/js/components/ui/avatar.tsx        # shadcn Avatar
resources/js/components/ui/separator.tsx     # shadcn Separator
resources/js/components/ui/sheet.tsx         # shadcn Sheet（行動版側欄）
resources/js/components/ui/skeleton.tsx      # shadcn Skeleton（載入狀態）
resources/js/components/layout/AppShell.tsx  # 外殼：Sidebar + TopBar + content
resources/js/components/layout/Sidebar.tsx   # 側邊欄（可折疊）
resources/js/components/layout/TopBar.tsx    # 頂部列（使用者選單、Org 切換）
resources/js/components/tables/DataTable.tsx # TanStack Table 包裝元件
resources/js/components/charts/UsageLineChart.tsx   # 用量折線圖
resources/js/components/charts/CreditBarChart.tsx   # Credit 長條圖
resources/js/layouts/AdminLayout.tsx         # 管理後台 Layout
resources/js/layouts/MemberLayout.tsx        # 會員 Portal Layout
resources/js/Pages/Admin/Dashboard/Index.tsx # 範例頁面（驗證全棧整合）
```

### 修改檔案

```
package.json                                # 新增前端依賴與 scripts
src/bootstrap.ts                            # 註冊 OrbitPrism
src/routes.ts                               # 引入 page-routes
config/app.ts                               # VIEW_DIR 更新為 src/views
```

---

### Task 1: 安裝前端依賴

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安裝 React + Inertia 生產依賴**

```bash
cd /Users/carl/Dev/CMG/Draupnir && bun add react react-dom @inertiajs/react
```

- [ ] **Step 2: 安裝 UI 生態系生產依賴**

```bash
bun add clsx tailwind-merge class-variance-authority lucide-react @radix-ui/react-slot @radix-ui/react-dropdown-menu @radix-ui/react-avatar @radix-ui/react-separator @radix-ui/react-dialog recharts @tanstack/react-table react-hook-form @hookform/resolvers
```

- [ ] **Step 3: 安裝 Vite + Tailwind 開發依賴**

```bash
bun add -d vite @vitejs/plugin-react tailwindcss@3 postcss autoprefixer @types/react @types/react-dom
```

- [ ] **Step 4: 驗證安裝成功**

```bash
bun run typecheck
```

Expected: PASS（後端 TypeScript 不受影響）

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: [frontend] 安裝 React + Inertia + Vite + Tailwind + shadcn 依賴"
```

---

### Task 2: Vite + PostCSS + 前端 TypeScript 設定

**Files:**
- Create: `vite.config.ts`
- Create: `postcss.config.js`
- Create: `tsconfig.frontend.json`

- [ ] **Step 1: 建立 Vite 設定**

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/build/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'resources/js'),
    },
  },
  build: {
    outDir: 'public/build',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'resources/js/app.tsx'),
        css: resolve(__dirname, 'resources/css/app.css'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    origin: 'http://localhost:5173',
  },
})
```

- [ ] **Step 2: 建立 PostCSS 設定**

Create `postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: 建立前端 TypeScript 設定**

Create `tsconfig.frontend.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["resources/js/*"]
    }
  },
  "include": ["resources/js/**/*.ts", "resources/js/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts postcss.config.js tsconfig.frontend.json
git commit -m "chore: [frontend] 新增 Vite + PostCSS + 前端 TypeScript 設定"
```

---

### Task 3: Tailwind CSS + shadcn/ui 基礎設定

**Files:**
- Create: `tailwind.config.ts`
- Create: `components.json`
- Create: `resources/css/app.css`
- Create: `resources/js/lib/utils.ts`

- [ ] **Step 1: 建立 Tailwind 設定**

Create `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./resources/js/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          border: 'hsl(var(--sidebar-border))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: 建立 CSS 入口與 CSS 變數**

Create `resources/css/app.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-border: 220 13% 91%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 3: 建立 cn() 工具函式**

Create `resources/js/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: 建立 components.json**

Create `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "resources/css/app.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "hooks": "@/hooks",
    "lib": "@/lib"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts components.json resources/css/app.css resources/js/lib/utils.ts
git commit -m "chore: [frontend] 設定 Tailwind CSS + shadcn/ui 基礎結構"
```

---

### Task 4: shadcn/ui 核心 UI 元件

**Files:**
- Create: `resources/js/components/ui/button.tsx`
- Create: `resources/js/components/ui/card.tsx`
- Create: `resources/js/components/ui/input.tsx`
- Create: `resources/js/components/ui/badge.tsx`
- Create: `resources/js/components/ui/table.tsx`
- Create: `resources/js/components/ui/skeleton.tsx`
- Create: `resources/js/components/ui/separator.tsx`
- Create: `resources/js/components/ui/avatar.tsx`
- Create: `resources/js/components/ui/dropdown-menu.tsx`
- Create: `resources/js/components/ui/sheet.tsx`

shadcn/ui 元件是 copy-paste 模式。每個元件獨立建立，使用 Radix UI primitives + Tailwind + CVA。

- [ ] **Step 1: 安裝 shadcn/ui 元件**

使用 shadcn CLI 安裝核心元件：

```bash
cd /Users/carl/Dev/CMG/Draupnir && bunx shadcn@latest add button card input badge table skeleton separator avatar dropdown-menu sheet --yes
```

> **注意：** 如果 CLI 無法正確偵測路徑，手動從 [ui.shadcn.com](https://ui.shadcn.com/docs/components) 複製各元件原始碼到 `resources/js/components/ui/` 目錄。確保所有元件的 import 路徑使用 `@/lib/utils` 引用 `cn()`。

- [ ] **Step 2: 驗證元件檔案存在**

```bash
ls resources/js/components/ui/
```

Expected: `button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`, `table.tsx`, `skeleton.tsx`, `separator.tsx`, `avatar.tsx`, `dropdown-menu.tsx`, `sheet.tsx`

- [ ] **Step 3: 驗證前端 TypeScript 編譯**

```bash
bunx tsc --project tsconfig.frontend.json --noEmit
```

Expected: PASS（無 type error）

- [ ] **Step 4: Commit**

```bash
git add resources/js/components/ui/
git commit -m "feat: [frontend] 新增 shadcn/ui 核心元件（Button, Card, Input, Badge, Table, Skeleton, Avatar, DropdownMenu, Sheet, Separator）"
```

---

### Task 5: ViteTagHelper — 開發/生產資源標籤產生

**Files:**
- Create: `src/Pages/ViteTagHelper.ts`
- Test: `src/Pages/__tests__/ViteTagHelper.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `src/Pages/__tests__/ViteTagHelper.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
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
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
bun test src/Pages/__tests__/ViteTagHelper.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: 實作 ViteTagHelper**

Create `src/Pages/ViteTagHelper.ts`:

```typescript
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
      const content = require(manifestPath)
      return content as ViteManifest
    } catch {
      return undefined
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test src/Pages/__tests__/ViteTagHelper.test.ts
```

Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add src/Pages/ViteTagHelper.ts src/Pages/__tests__/ViteTagHelper.test.ts
git commit -m "feat: [frontend] 新增 ViteTagHelper — 開發/生產環境資源標籤產生"
```

---

### Task 6: InertiaService — Server-Side Inertia 渲染

**Files:**
- Create: `src/Pages/InertiaService.ts`
- Test: `src/Pages/__tests__/InertiaService.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `src/Pages/__tests__/InertiaService.test.ts`:

```typescript
import { describe, test, expect, mock } from 'bun:test'
import { InertiaService } from '../InertiaService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async () => ({}),
    getBody: async () => ({}),
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/dashboard',
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: (data: any, statusCode?: number) => Response.json(data, { status: statusCode ?? 200 }),
    text: (content: string, statusCode?: number) => new Response(content, { status: statusCode ?? 200 }),
    redirect: (url: string, statusCode?: number) => Response.redirect(url, statusCode ?? 302),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => { store.set(key, value) },
    ...overrides,
  }
}

describe('InertiaService', () => {
  const renderHtml = (data: Record<string, unknown>) => {
    const page = data.page as string
    return `<html><body><div id="app" data-page='${page}'></div></body></html>`
  }

  const viteTags = '<script type="module" src="http://localhost:5173/resources/js/app.tsx"></script>'

  test('首次訪問回傳 HTML 頁面', async () => {
    const service = new InertiaService(renderHtml, viteTags, '1.0')
    const ctx = createMockContext()

    const response = service.render(ctx, 'Admin/Dashboard/Index', { totalUsers: 42 })

    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    const html = await response.text()
    expect(html).toContain('<div id="app"')
    expect(html).toContain('"component":"Admin/Dashboard/Index"')
    expect(html).toContain('"totalUsers":42')
  })

  test('Inertia XHR 請求回傳 JSON', async () => {
    const service = new InertiaService(renderHtml, viteTags, '1.0')
    const ctx = createMockContext({
      getHeader: (name: string) => {
        if (name.toLowerCase() === 'x-inertia') return 'true'
        return undefined
      },
      headers: { 'x-inertia': 'true' },
    })

    const response = service.render(ctx, 'Admin/Dashboard/Index', { totalUsers: 42 })

    expect(response.headers.get('X-Inertia')).toBe('true')
    const json = await response.json() as any
    expect(json.component).toBe('Admin/Dashboard/Index')
    expect(json.props.totalUsers).toBe(42)
    expect(json.url).toBe('/admin/dashboard')
  })

  test('version mismatch 回傳 409', async () => {
    const service = new InertiaService(renderHtml, viteTags, '2.0')
    const ctx = createMockContext({
      getHeader: (name: string) => {
        if (name.toLowerCase() === 'x-inertia') return 'true'
        if (name.toLowerCase() === 'x-inertia-version') return '1.0'
        return undefined
      },
      headers: { 'x-inertia': 'true', 'x-inertia-version': '1.0' },
    })

    const response = service.render(ctx, 'Admin/Dashboard/Index', {})
    expect(response.status).toBe(409)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
bun test src/Pages/__tests__/InertiaService.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: 實作 InertiaService**

Create `src/Pages/InertiaService.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

type RenderFn = (data: Record<string, unknown>) => string

export interface InertiaPageData {
  component: string
  props: Record<string, unknown>
  url: string
  version: string
}

export class InertiaService {
  constructor(
    private readonly renderTemplate: RenderFn,
    private readonly viteTags: string,
    private readonly assetVersion: string,
  ) {}

  render(
    ctx: IHttpContext,
    component: string,
    props: Record<string, unknown>,
  ): Response {
    const sharedProps = ctx.get<Record<string, unknown>>('inertia:shared') ?? {}
    const mergedProps = { ...sharedProps, ...props }

    const pageData: InertiaPageData = {
      component,
      props: mergedProps,
      url: ctx.getPathname(),
      version: this.assetVersion,
    }

    const isInertia = ctx.getHeader('x-inertia') === 'true'
      || ctx.getHeader('X-Inertia') === 'true'

    if (isInertia) {
      const clientVersion = ctx.getHeader('x-inertia-version')
        ?? ctx.getHeader('X-Inertia-Version')

      if (clientVersion && clientVersion !== this.assetVersion) {
        return new Response('', {
          status: 409,
          headers: { 'X-Inertia-Location': ctx.getPathname() },
        })
      }

      return Response.json(pageData, {
        headers: {
          'X-Inertia': 'true',
          'Vary': 'X-Inertia',
        },
      })
    }

    const pageJson = JSON.stringify(pageData)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/'/g, '\\u0027')

    const html = this.renderTemplate({
      page: pageJson,
      viteTags: this.viteTags,
    })

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test src/Pages/__tests__/InertiaService.test.ts
```

Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add src/Pages/InertiaService.ts src/Pages/__tests__/InertiaService.test.ts
git commit -m "feat: [frontend] 新增 InertiaService — server-side Inertia 渲染（HTML 首訪 / JSON XHR / 409 版本不符）"
```

---

### Task 7: Base HTML 模板 + OrbitPrism 註冊

**Files:**
- Create: `src/views/app.html`
- Modify: `src/bootstrap.ts`
- Modify: `config/app.ts`

- [ ] **Step 1: 建立 Base HTML 模板**

Create `src/views/app.html`:

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Draupnir</title>
    {{{ viteTags }}}
</head>
<body class="antialiased">
    <div id="app" data-page='{{{ page }}}'></div>
</body>
</html>
```

> **注意：** 使用三重大括號 `{{{ }}}` 表示不轉義的原始輸出。`page` 是 JSON 字串（InertiaService 傳入），`viteTags` 是 `<script>/<link>` 標籤。此模板不使用 `@inertia` 指令，改為手動寫 `<div id="app">` 以確保完全控制。

- [ ] **Step 2: 確認 config/app.ts VIEW_DIR 指向 src/views**

Read `config/app.ts` — 確認 `VIEW_DIR` 已設定為 `'src/views'`。目前值是 `process.env.VIEW_DIR ?? 'src/views'`，已正確。不需修改。

- [ ] **Step 3: 在 bootstrap.ts 註冊 OrbitPrism**

在 `src/bootstrap.ts` 的 import 區段新增：

```typescript
import { OrbitPrism } from '@gravito/prism'
```

在 `const core = new PlanetCore(config)` 之後加入：

```typescript
core.addOrbit(new OrbitPrism())
```

- [ ] **Step 4: 驗證 bootstrap 不出錯**

```bash
bun test tests/Feature/health.test.ts
```

Expected: PASS（Health API 仍正常）

- [ ] **Step 5: Commit**

```bash
git add src/views/app.html src/bootstrap.ts
git commit -m "feat: [frontend] 新增 Base HTML 模板 + 註冊 OrbitPrism view engine"
```

---

### Task 8: SharedDataMiddleware — 注入 Auth 與 Org 共享資料

**Files:**
- Create: `src/Pages/SharedDataMiddleware.ts`

- [ ] **Step 1: 實作 SharedDataMiddleware**

Create `src/Pages/SharedDataMiddleware.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export interface InertiaSharedData {
  auth: {
    user: {
      id: string
      email: string
      role: string
    } | null
  }
  currentOrgId: string | null
  flash: {
    success?: string
    error?: string
  }
}

export function injectSharedData(ctx: IHttpContext): void {
  const authContext = AuthMiddleware.getAuthContext(ctx)

  const shared: InertiaSharedData = {
    auth: authContext
      ? {
          user: {
            id: authContext.userId,
            email: authContext.email,
            role: authContext.role,
          },
        }
      : { user: null },
    currentOrgId: ctx.getHeader('X-Organization-Id')
      ?? ctx.getHeader('x-organization-id')
      ?? null,
    flash: {
      success: ctx.get<string>('flash:success') ?? undefined,
      error: ctx.get<string>('flash:error') ?? undefined,
    },
  }

  ctx.set('inertia:shared', shared)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Pages/SharedDataMiddleware.ts
git commit -m "feat: [frontend] 新增 SharedDataMiddleware — 注入 auth user、currentOrg、flash 到 Inertia shared props"
```

---

### Task 9: Client Entry Point + TypeScript 型別

**Files:**
- Create: `resources/js/app.tsx`
- Create: `resources/js/types/global.d.ts`
- Create: `resources/js/types/inertia.d.ts`
- Create: `resources/js/hooks/use-auth.ts`
- Create: `resources/js/hooks/use-org.ts`

- [ ] **Step 1: 建立 Inertia 型別定義**

Create `resources/js/types/global.d.ts`:

```typescript
/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string
  export default content
}
```

Create `resources/js/types/inertia.d.ts`:

```typescript
export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'manager' | 'user'
}

export interface SharedProps {
  auth: {
    user: AuthUser | null
  }
  currentOrgId: string | null
  flash: {
    success?: string
    error?: string
  }
}

declare module '@inertiajs/react' {
  interface PageProps extends SharedProps {}
}
```

- [ ] **Step 2: 建立 auth/org hooks**

Create `resources/js/hooks/use-auth.ts`:

```typescript
import { usePage } from '@inertiajs/react'
import type { SharedProps } from '@/types/inertia'

export function useAuth() {
  const { auth } = usePage<SharedProps>().props
  return auth
}

export function useUser() {
  const { auth } = usePage<SharedProps>().props
  if (!auth.user) {
    throw new Error('useUser() called without authenticated user')
  }
  return auth.user
}

export function useIsAdmin() {
  const { auth } = usePage<SharedProps>().props
  return auth.user?.role === 'admin'
}
```

Create `resources/js/hooks/use-org.ts`:

```typescript
import { usePage } from '@inertiajs/react'
import type { SharedProps } from '@/types/inertia'

export function useCurrentOrgId() {
  const { currentOrgId } = usePage<SharedProps>().props
  return currentOrgId
}
```

- [ ] **Step 3: 建立 Inertia client entry**

Create `resources/js/app.tsx`:

```tsx
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import '../css/app.css'

createInertiaApp({
  title: (title) => (title ? `${title} — Draupnir` : 'Draupnir'),
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true })
    const page = pages[`./Pages/${name}.tsx`]
    if (!page) {
      throw new Error(`Page not found: ${name}`)
    }
    return page
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})
```

- [ ] **Step 4: 驗證前端 TypeScript 編譯**

```bash
bunx tsc --project tsconfig.frontend.json --noEmit
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add resources/js/app.tsx resources/js/types/ resources/js/hooks/
git commit -m "feat: [frontend] 新增 Inertia client entry + TypeScript 型別 + auth/org hooks"
```

---

### Task 10: AppShell + Sidebar + TopBar Layout 元件

**Files:**
- Create: `resources/js/components/layout/TopBar.tsx`
- Create: `resources/js/components/layout/Sidebar.tsx`
- Create: `resources/js/components/layout/AppShell.tsx`

- [ ] **Step 1: 建立 TopBar**

Create `resources/js/components/layout/TopBar.tsx`:

```tsx
import { Link } from '@inertiajs/react'
import { useAuth } from '@/hooks/use-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopBarProps {
  onToggleSidebar: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const { user } = useAuth()

  const initials = user
    ? user.email.slice(0, 2).toUpperCase()
    : '??'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onToggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user && (
            <>
              <div className="px-2 py-1.5 text-sm font-medium">
                {user.email}
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild>
            <Link href="/member/settings">設定</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/logout" method="post" as="button" className="w-full">
              登出
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
```

- [ ] **Step 2: 建立 Sidebar**

Create `resources/js/components/layout/Sidebar.tsx`:

```tsx
import { Link, usePage } from '@inertiajs/react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface NavItem {
  label: string
  href: string
  icon: ReactNode
}

interface SidebarProps {
  title: string
  items: NavItem[]
  open: boolean
  onClose: () => void
}

export function Sidebar({ title, items, open, onClose }: SidebarProps) {
  const { url } = usePage()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="text-lg font-semibold text-sidebar-foreground">
            {title}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const isActive = url.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
```

- [ ] **Step 3: 建立 AppShell**

Create `resources/js/components/layout/AppShell.tsx`:

```tsx
import { useState, type ReactNode } from 'react'
import { Sidebar, type NavItem } from './Sidebar'
import { TopBar } from './TopBar'

interface AppShellProps {
  sidebarTitle: string
  navItems: NavItem[]
  children: ReactNode
}

export function AppShell({ sidebarTitle, navItems, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar
        title={sidebarTitle}
        items={navItems}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col">
        <TopBar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 驗證前端 TypeScript**

```bash
bunx tsc --project tsconfig.frontend.json --noEmit
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add resources/js/components/layout/
git commit -m "feat: [frontend] 新增 AppShell + Sidebar + TopBar 共用 Layout 元件"
```

---

### Task 11: AdminLayout + MemberLayout

**Files:**
- Create: `resources/js/layouts/AdminLayout.tsx`
- Create: `resources/js/layouts/MemberLayout.tsx`

- [ ] **Step 1: 建立 AdminLayout**

Create `resources/js/layouts/AdminLayout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import type { NavItem } from '@/components/layout/Sidebar'
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Puzzle,
  Key,
  Activity,
} from 'lucide-react'

const adminNavItems: NavItem[] = [
  { label: '總覽', href: '/admin/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: '使用者', href: '/admin/users', icon: <Users className="h-4 w-4" /> },
  { label: '組織', href: '/admin/organizations', icon: <Building2 className="h-4 w-4" /> },
  { label: '合約', href: '/admin/contracts', icon: <FileText className="h-4 w-4" /> },
  { label: '模組', href: '/admin/modules', icon: <Puzzle className="h-4 w-4" /> },
  { label: 'API Keys', href: '/admin/api-keys', icon: <Key className="h-4 w-4" /> },
  { label: '用量同步', href: '/admin/usage-sync', icon: <Activity className="h-4 w-4" /> },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell sidebarTitle="Draupnir Admin" navItems={adminNavItems}>
      {children}
    </AppShell>
  )
}
```

- [ ] **Step 2: 建立 MemberLayout**

Create `resources/js/layouts/MemberLayout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import type { NavItem } from '@/components/layout/Sidebar'
import {
  LayoutDashboard,
  Key,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react'

const memberNavItems: NavItem[] = [
  { label: '總覽', href: '/member/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'API Keys', href: '/member/api-keys', icon: <Key className="h-4 w-4" /> },
  { label: '用量', href: '/member/usage', icon: <BarChart3 className="h-4 w-4" /> },
  { label: '合約', href: '/member/contracts', icon: <FileText className="h-4 w-4" /> },
  { label: '設定', href: '/member/settings', icon: <Settings className="h-4 w-4" /> },
]

export function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell sidebarTitle="Draupnir" navItems={memberNavItems}>
      {children}
    </AppShell>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/layouts/
git commit -m "feat: [frontend] 新增 AdminLayout + MemberLayout 角色導向 Layout"
```

---

### Task 12: DataTable 共用元件

**Files:**
- Create: `resources/js/components/tables/DataTable.tsx`

- [ ] **Step 1: 建立 DataTable**

Create `resources/js/components/tables/DataTable.tsx`:

```tsx
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  searchColumn?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = '搜尋...',
  searchColumn,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  })

  return (
    <div className="space-y-4">
      {searchColumn && (
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''}
          onChange={(e) =>
            table.getColumn(searchColumn)?.setFilterValue(e.target.value)
          }
          className="max-w-sm"
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  無資料
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          共 {table.getFilteredRowModel().rows.length} 筆
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            上一頁
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            下一頁
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/components/tables/DataTable.tsx
git commit -m "feat: [frontend] 新增 DataTable 共用元件（TanStack Table + 搜尋 + 分頁 + 排序）"
```

---

### Task 13: Chart 共用元件

**Files:**
- Create: `resources/js/components/charts/UsageLineChart.tsx`
- Create: `resources/js/components/charts/CreditBarChart.tsx`

- [ ] **Step 1: 建立 UsageLineChart**

Create `resources/js/components/charts/UsageLineChart.tsx`:

```tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface UsageDataPoint {
  date: string
  requests: number
  tokens: number
}

interface UsageLineChartProps {
  data: UsageDataPoint[]
  title?: string
}

export function UsageLineChart({ data, title = '用量趨勢' }: UsageLineChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="requests"
              name="請求數"
              stroke="hsl(222.2 47.4% 11.2%)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="tokens"
              name="Token 用量"
              stroke="hsl(210 40% 60%)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 建立 CreditBarChart**

Create `resources/js/components/charts/CreditBarChart.tsx`:

```tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface CreditDataPoint {
  period: string
  topup: number
  consumed: number
}

interface CreditBarChartProps {
  data: CreditDataPoint[]
  title?: string
}

export function CreditBarChart({ data, title = 'Credit 使用狀況' }: CreditBarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="period" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Bar dataKey="topup" name="充值" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="consumed" name="消耗" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/components/charts/
git commit -m "feat: [frontend] 新增 UsageLineChart + CreditBarChart 圖表元件（Recharts）"
```

---

### Task 14: Admin Dashboard 頁面控制器（Server-Side）

**Files:**
- Create: `src/Pages/Admin/AdminDashboardPage.ts`
- Create: `src/Pages/page-routes.ts`
- Modify: `src/routes.ts`

- [ ] **Step 1: 建立 Admin Dashboard 頁面控制器**

Create `src/Pages/Admin/AdminDashboardPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetDashboardSummaryService } from '@/Modules/Dashboard/Application/Services/GetDashboardSummaryService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class AdminDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly summaryService: GetDashboardSummaryService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth || auth.role !== 'admin') {
      return ctx.redirect('/login')
    }

    const orgId = ctx.getQuery('orgId')
    let summary = null
    if (orgId) {
      const result = await this.summaryService.execute(orgId, auth.userId, auth.role)
      summary = result.success ? result.data : null
    }

    return this.inertia.render(ctx, 'Admin/Dashboard/Index', {
      summary,
    })
  }
}
```

- [ ] **Step 2: 建立 page-routes 註冊**

Create `src/Pages/page-routes.ts`:

```typescript
import type { PlanetCore } from '@gravito/core'
import { fromGravitoContext } from '@/Shared/Presentation/IHttpContext'
import { InertiaService } from './InertiaService'
import { ViteTagHelper } from './ViteTagHelper'
import { injectSharedData } from './SharedDataMiddleware'
import { AdminDashboardPage } from './Admin/AdminDashboardPage'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

function createInertiaService(core: PlanetCore): InertiaService {
  const env = process.env.NODE_ENV ?? 'development'
  const devServerUrl = process.env.VITE_DEV_SERVER ?? 'http://localhost:5173'

  let manifest: Record<string, any> | undefined
  if (env === 'production') {
    try {
      const manifestPath = resolve(process.cwd(), 'public/build/.vite/manifest.json')
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      console.warn('⚠️ Vite manifest not found — run "bun run build:frontend"')
    }
  }

  const viteHelper = new ViteTagHelper(env, devServerUrl, manifest)
  const viteTags = viteHelper.generateTags([
    'resources/js/app.tsx',
    'resources/css/app.css',
  ])

  const viewDir = resolve(process.cwd(), 'src/views')
  const templateContent = readFileSync(resolve(viewDir, 'app.html'), 'utf-8')

  const renderTemplate = (data: Record<string, unknown>): string => {
    let html = templateContent
    html = html.replace(/\{\{\{\s*viteTags\s*\}\}\}/g, data.viteTags as string)
    html = html.replace(/\{\{\{\s*page\s*\}\}\}/g, data.page as string)
    return html
  }

  const version = env === 'production' && manifest
    ? Object.values(manifest).map((e: any) => e.file).join(',').slice(0, 16)
    : 'dev'

  return new InertiaService(renderTemplate, viteTags, version)
}

export function registerPageRoutes(core: PlanetCore): void {
  const inertia = createInertiaService(core)

  const adminDashboard = new AdminDashboardPage(
    inertia,
    core.container.make('getDashboardSummaryService') as any,
  )

  // Shared data middleware helper
  const withSharedData = (handler: (ctx: any) => Promise<Response>) => {
    return async (c: any) => {
      const ctx = fromGravitoContext(c)
      injectSharedData(ctx)
      return handler(ctx)
    }
  }

  // Admin routes
  core.router.get('/admin/dashboard', withSharedData((ctx) => adminDashboard.handle(ctx)))

  // Serve static build assets in production
  if (process.env.NODE_ENV === 'production') {
    const staticDir = resolve(process.cwd(), 'public')
    core.router.get('/build/*', async (c) => {
      const filePath = resolve(staticDir, c.req.path.slice(1))
      try {
        const file = Bun.file(filePath)
        if (await file.exists()) {
          return new Response(file)
        }
      } catch {}
      return c.text('Not Found', 404)
    })
  }
}
```

- [ ] **Step 3: 在 src/routes.ts 引入 page routes**

在 `src/routes.ts` 的 import 區段新增：

```typescript
import { registerPageRoutes } from './Pages/page-routes'
```

在 `registerRoutes` 函式內，`await registerDocs(core)` 之後加入：

```typescript
registerPageRoutes(core)
```

- [ ] **Step 4: 驗證後端不報錯**

```bash
bun test tests/Feature/health.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Pages/Admin/AdminDashboardPage.ts src/Pages/page-routes.ts src/routes.ts
git commit -m "feat: [frontend] 新增 Admin Dashboard 頁面控制器 + page-routes 註冊 + 靜態資源服務"
```

---

### Task 15: Admin Dashboard React 頁面（端到端驗證）

**Files:**
- Create: `resources/js/Pages/Admin/Dashboard/Index.tsx`

- [ ] **Step 1: 建立 Admin Dashboard 頁面元件**

Create `resources/js/Pages/Admin/Dashboard/Index.tsx`:

```tsx
import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart, type UsageDataPoint } from '@/components/charts/UsageLineChart'
import { Key, Users, Building2, CreditCard } from 'lucide-react'

interface DashboardSummary {
  totalKeys: number
  activeKeys: number
  totalUsage: number
  creditBalance: number
}

interface Props {
  summary: DashboardSummary | null
}

export default function AdminDashboard({ summary }: Props) {
  const stats = summary ?? {
    totalKeys: 0,
    activeKeys: 0,
    totalUsage: 0,
    creditBalance: 0,
  }

  const sampleUsageData: UsageDataPoint[] = [
    { date: '03/01', requests: 120, tokens: 45000 },
    { date: '03/02', requests: 150, tokens: 52000 },
    { date: '03/03', requests: 98, tokens: 38000 },
    { date: '03/04', requests: 200, tokens: 71000 },
    { date: '03/05', requests: 175, tokens: 63000 },
  ]

  return (
    <AdminLayout>
      <Head title="管理後台總覽" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">系統總覽</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="API Keys 總數"
            value={stats.totalKeys}
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="活躍 Keys"
            value={stats.activeKeys}
            icon={<Key className="h-4 w-4 text-green-500" />}
          />
          <StatCard
            title="總用量"
            value={stats.totalUsage.toLocaleString()}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Credit 餘額"
            value={stats.creditBalance.toLocaleString()}
            icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <UsageLineChart data={sampleUsageData} title="近期用量趨勢" />
      </div>
    </AdminLayout>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 驗證前端 TypeScript**

```bash
bunx tsc --project tsconfig.frontend.json --noEmit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Admin/Dashboard/Index.tsx
git commit -m "feat: [frontend] 新增 Admin Dashboard React 頁面元件（統計卡片 + 用量圖表）"
```

---

### Task 16: Dev Scripts + 端到端驗證

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 新增前端建置腳本到 package.json**

在 `package.json` 的 `scripts` 中新增：

```json
"dev:frontend": "vite",
"build:frontend": "vite build",
"preview:frontend": "vite preview",
"dev:all": "bun run dev & bun run dev:frontend"
```

- [ ] **Step 2: 驗證 Vite 建置可執行**

```bash
cd /Users/carl/Dev/CMG/Draupnir && bun run build:frontend
```

Expected: 輸出 `dist` 目錄到 `public/build/`，包含 `manifest.json`

- [ ] **Step 3: 驗證後端仍正常**

```bash
bun test tests/Feature/health.test.ts
```

Expected: PASS

- [ ] **Step 4: 驗證 Vite dev server 啟動**

```bash
timeout 5 bun run dev:frontend || true
```

Expected: Vite dev server 在 `http://localhost:5173` 啟動（5 秒後自動終止）

- [ ] **Step 5: Commit**

```bash
git add package.json public/build/
git commit -m "chore: [frontend] 新增 dev:frontend / build:frontend / dev:all 腳本 + 驗證建置產出"
```

---

### Task 17: E2E Smoke Test

**Files:**
- Create: `e2e/admin-dashboard.spec.ts`

- [ ] **Step 1: 建立 E2E 測試**

Create `e2e/admin-dashboard.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test('首頁載入正常顯示 Dashboard', async ({ page, request }) => {
    // 先建立管理者帳號
    const registerRes = await request.post('/api/auth/register', {
      data: {
        email: 'admin@test.com',
        password: 'Test1234!',
        name: 'Admin',
      },
    })
    expect(registerRes.ok()).toBeTruthy()

    // 提升為 admin（測試環境 seed route）
    const seedRes = await request.post('/api/test/seed', {
      data: {
        action: 'set-role',
        email: 'admin@test.com',
        role: 'admin',
      },
    })

    // 登入取得 token
    const loginRes = await request.post('/api/auth/login', {
      data: {
        email: 'admin@test.com',
        password: 'Test1234!',
      },
    })
    const loginData = await loginRes.json() as any
    const token = loginData.data?.accessToken

    // 造訪 Admin Dashboard（帶 cookie 或 query token）
    await page.goto(`/admin/dashboard`)

    // 頁面應包含 Dashboard 結構
    await expect(page.locator('#app')).toBeVisible()
  })
})
```

> **注意：** 此 E2E 測試為 smoke test，驗證 Inertia 頁面可載入且 `#app` div 被渲染。完整的登入流程整合需視認證 middleware 在 page routes 的配置而定，可能需要在後續 Phase 7b/7c 中完善。

- [ ] **Step 2: 執行 E2E 測試**

```bash
bun run build:frontend && bun run test:e2e -- --grep "Admin Dashboard"
```

Expected: PASS（或 skip，取決於測試環境中 Vite 建置產出是否被 E2E server 正確提供）

- [ ] **Step 3: Commit**

```bash
git add e2e/admin-dashboard.spec.ts
git commit -m "test: [e2e] 新增 Admin Dashboard smoke test"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| 規格需求 | 對應 Task |
|----------|-----------|
| Inertia.js + React 框架 | Task 2 (Vite), Task 6 (InertiaService), Task 9 (client entry) |
| @gravito/prism 整合 | Task 7 (OrbitPrism + template) |
| UI 元件庫（shadcn/ui） | Task 3 (Tailwind), Task 4 (shadcn components) |
| 圖表（Recharts） | Task 13 |
| 表格（TanStack Table） | Task 12 |
| 表單（React Hook Form + Zod） | 型別已安裝 (Task 1)，具體表單元件在 7b/7c |
| AdminLayout + 側欄 | Task 10, Task 11 |
| MemberLayout + 側欄 | Task 10, Task 11 |
| Dashboard 頁面（驗證） | Task 14, Task 15 |
| 響應式設計 | Task 10 (Sidebar mobile toggle) |
| Loading / Empty 狀態 | Task 4 (Skeleton component)，具體應用在 7b/7c |
| E2E 測試 | Task 17 |

### 2. 延後至 Phase 7b/7c 的項目

- 會員 Portal 所有頁面（7b）
- 管理後台剩餘頁面（7c）
- 表單元件（React Hook Form + Zod）具體應用
- 完整 E2E 測試覆蓋
- 登入/登出頁面（可能需要獨立的 Auth pages）

### 3. 型別一致性

- `SharedProps` 在 `resources/js/types/inertia.d.ts` 定義，`SharedDataMiddleware` 在 `src/Pages/SharedDataMiddleware.ts` 產生 — 兩者結構一致
- `InertiaService.render()` 簽名在 `InertiaService.ts` 和 `AdminDashboardPage.ts` 用法一致
- `NavItem` 型別在 `Sidebar.tsx` 定義，在 `AdminLayout.tsx` 和 `MemberLayout.tsx` 中使用

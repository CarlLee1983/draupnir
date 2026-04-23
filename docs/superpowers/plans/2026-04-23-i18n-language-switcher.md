# 語系切換功能實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作 Draupnir 平台的語系切換功能，支援 `zh-TW` 與 `en`。

**Architecture:**
- **後端**：增強 `resolvePageLocale.ts` 支援 Cookie 判斷，並新增 `LocaleController.ts`。
- **前端**：在 `TopBar.tsx` 加入切換 UI，透過 Inertia `router.post` 觸發切換。

**Tech Stack:** Gravito Cosmos, Inertia.js, React, Tailwind CSS

---

### Task 1: 增強語系解析器

**Files:**
- Modify: `src/Shared/Infrastructure/I18n/resolvePageLocale.ts`
- Test: `src/Shared/Infrastructure/I18n/__tests__/resolvePageLocale.test.ts` (若不存在則建立)

- [ ] **Step 1: 建立失敗測試**

```typescript
// src/Shared/Infrastructure/I18n/__tests__/resolvePageLocale.test.ts
import { describe, it, expect } from 'vitest'
import { resolvePageLocale } from '../resolvePageLocale'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

describe('resolvePageLocale', () => {
  it('should prefer draupnir_locale cookie over accept-language header', () => {
    const mockCtx = {
      getCookie: (name: string) => (name === 'draupnir_locale' ? 'en' : undefined),
      getHeader: () => 'zh-TW',
    } as unknown as IHttpContext

    expect(resolvePageLocale(mockCtx)).toBe('en')
  })

  it('should fallback to accept-language if cookie is missing', () => {
    const mockCtx = {
      getCookie: () => undefined,
      getHeader: (name: string) => (name.toLowerCase() === 'accept-language' ? 'en' : undefined),
    } as unknown as IHttpContext

    expect(resolvePageLocale(mockCtx)).toBe('en')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

- [ ] **Step 3: 實作 Cookie 優先邏輯**

```typescript
// src/Shared/Infrastructure/I18n/resolvePageLocale.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { LocaleCode } from './loadMessages'

export function resolvePageLocale(ctx: IHttpContext): LocaleCode {
  const cookieLocale = ctx.getCookie('draupnir_locale')
  if (cookieLocale === 'en' || cookieLocale === 'zh-TW') {
    return cookieLocale
  }

  const acceptLanguage = ctx.getHeader('accept-language') ?? ctx.getHeader('Accept-Language') ?? ''
  if (acceptLanguage.startsWith('en')) return 'en'
  return 'zh-TW'
}
```

- [ ] **Step 4: 執行測試確認通過**

### Task 2: 建立 LocaleController 與註冊路由

**Files:**
- Create: `src/Shared/Infrastructure/I18n/LocaleController.ts`
- Modify: `src/Website/bootstrap/registerWebsiteRoutes.ts`

- [ ] **Step 1: 實作 LocaleController**

```typescript
// src/Shared/Infrastructure/I18n/LocaleController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

export class LocaleController {
  async switchLocale(ctx: IHttpContext): Promise<Response> {
    const body = await ctx.request.json()
    const locale = body?.locale
    
    if (locale === 'en' || locale === 'zh-TW') {
      ctx.setCookie('draupnir_locale', locale, {
        path: '/',
        maxAge: 31536000, // 1 year
        sameSite: 'Lax',
      })
    }
    
    return ctx.redirect(ctx.getHeader('referer') ?? '/')
  }
}
```

- [ ] **Step 2: 註冊路由**

```typescript
// src/Website/bootstrap/registerWebsiteRoutes.ts
import { LocaleController } from '@/Shared/Infrastructure/I18n/LocaleController'
// ... 在 registerWebsiteRoutes 函式內
const localeController = new LocaleController()
router.post('/lang', (ctx) => localeController.switchLocale(ctx))
```

### Task 3: 新增翻譯 Key

**Files:**
- Modify: `src/Shared/Infrastructure/I18n/locales/zh-TW.ts`
- Modify: `src/Shared/Infrastructure/I18n/locales/en.ts`
- Modify: `resources/js/lib/i18n.ts`

- [ ] **Step 1: 加入語系名稱與 Label**
  - `ui.layout.topBar.language`: 'Language' / '語言'
  - `ui.common.lang.zh-TW`: '繁體中文'
  - `ui.common.lang.en`: 'English'

- [ ] **Step 2: 更新 resources/js/lib/i18n.ts 的 frontendCatalog 以包含新 Key**

### Task 4: 前端 UI 整合 (TopBar)

**Files:**
- Modify: `resources/js/components/layout/TopBar.tsx`

- [ ] **Step 1: 讀取 resources/js/components/layout/TopBar.tsx 確認實作方式**

- [ ] **Step 2: 實作語系切換選單**
  - 使用 `DropdownMenu` (專案應有使用 Radix UI 或 shadcn/ui)
  - 使用 `router.post('/lang', { locale: '...' }, { preserveScroll: true })`

- [ ] **Step 3: 驗證 UI 切換效果**

### Task 5: 最終驗證

- [ ] **Step 1: 執行現有測試確保無迴歸**
- [ ] **Step 2: 手動在瀏覽器驗證切換流程與 Cookie 持久化**

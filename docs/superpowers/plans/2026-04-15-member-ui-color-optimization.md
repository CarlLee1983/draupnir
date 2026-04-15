# Member 頁面提示配色優化實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立統一的 `Banner` 組件並套用到所有 Member 頁面，將「請先選擇組織」提示從紅色改為更和諧的琥珀色（Amber）。

**Architecture:** 
1. 建立 `Banner` 組件於 `resources/js/components/ui/banner.tsx`。
2. 該組件支援 `tone` 屬性 (`warning` | `destructive` | `info`)。
3. 更新各頁面，根據 `error.key` 的後綴判定語調。

**Tech Stack:** React, Tailwind CSS, Lucide React, Inertia.js.

---

### Task 1: 建立 Banner 組件

**Files:**
- Create: `resources/js/components/ui/banner.tsx`

- [ ] **Step 1: 建立 Banner 組件檔案**

```tsx
import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type BannerTone = 'warning' | 'destructive' | 'info'

interface BannerProps {
  tone?: BannerTone
  title?: string
  message: string
  className?: string
}

const toneStyles: Record<BannerTone, string> = {
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  destructive: 'border-destructive/50 bg-destructive/10 text-destructive',
  info: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400',
}

const toneIcons: Record<BannerTone, React.ReactNode> = {
  warning: <AlertTriangle className="h-4 w-4" />,
  destructive: <AlertCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
}

export function Banner({ tone = 'info', title, message, className }: BannerProps) {
  return (
    <div className={cn('flex gap-3 rounded-xl border p-4 shadow-sm backdrop-blur-sm', toneStyles[tone], className)}>
      <div className="mt-0.5 shrink-0">{toneIcons[tone]}</div>
      <div className="space-y-1">
        {title && <h4 className="text-sm font-bold leading-none tracking-tight">{title}</h4>}
        <p className="text-sm leading-relaxed opacity-90">{message}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 確認檔案建立成功**

Run: `ls resources/js/components/ui/banner.tsx`
Expected: 檔案存在

- [ ] **Step 3: Commit**

```bash
git add resources/js/components/ui/banner.tsx
git commit -m "feat: [ui] 建立統一的 Banner 組件"
```

---

### Task 2: 更新 Member Dashboard

**Files:**
- Modify: `resources/js/Pages/Member/Dashboard/Index.tsx`

- [ ] **Step 1: 匯入 Banner 並替換 InfoCard**

```tsx
// 移除 InfoCard 的定義與使用，改用 Banner
import { Banner } from '@/components/ui/banner'

// 在渲染邏輯中：
{error && (
  <Banner 
    tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'} 
    title="Organization" 
    message={t(error.key, error.params)} 
  />
)}
{fetchError && <Banner tone="destructive" title="Analytics" message={fetchError} />}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Member/Dashboard/Index.tsx
git commit -m "style: [dashboard] 套用統一的 Banner 組件並優化配色"
```

---

### Task 3: 更新 Member API Keys 頁面

**Files:**
- Modify: `resources/js/Pages/Member/ApiKeys/Index.tsx`

- [ ] **Step 1: 匯入 Banner 並替換紅色 div**

```tsx
import { Banner } from '@/components/ui/banner'

// 替換：
{error && <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>}

// 為：
{error && (
  <Banner 
    tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'} 
    message={t(error.key, error.params)} 
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Member/ApiKeys/Index.tsx
git commit -m "style: [api-keys] 套用統一的 Banner 組件並優化配色"
```

---

### Task 4: 更新 Member Usage 頁面 (修復與優化)

**Files:**
- Modify: `resources/js/Pages/Member/Usage/Index.tsx`

- [ ] **Step 1: 補上 error Props 並渲染 Banner**

```tsx
// 更新 Props 介面
interface Props {
  orgId: string | null
  totals: UsageTotals
  chartData: UsageDataPoint[]
  error: I18nMessage | null // 補上
}

// 渲染邏輯
import { Banner } from '@/components/ui/banner'

// 在 h1 下方加入：
{error && (
  <Banner 
    tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'} 
    message={t(error.key, error.params)} 
    className="mb-6"
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Member/Usage/Index.tsx
git commit -m "fix: [usage] 補上漏掉的錯誤提示渲染並套用 Banner"
```

---

### Task 5: 更新 Member Cost Breakdown 頁面

**Files:**
- Modify: `resources/js/Pages/Member/CostBreakdown/Index.tsx`

- [ ] **Step 1: 匯入 Banner 並移除區域性 InfoBanner**

```tsx
import { Banner } from '@/components/ui/banner'

// 移除檔案末尾的 InfoBanner 定義
// 在渲染邏輯中替換：
{error ? <InfoBanner title="Organization" message={t(error.key, error.params)} /> : null}
{fetchError ? <InfoBanner title="Analytics" message={fetchError} /> : null}

// 為：
{error && (
  <Banner 
    tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'} 
    title="Organization" 
    message={t(error.key, error.params)} 
  />
)}
{fetchError && <Banner tone="destructive" title="Analytics" message={fetchError} />}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Member/CostBreakdown/Index.tsx
git commit -m "style: [cost-breakdown] 套用統一的 Banner 組件並優化配色"
```

---

### Task 6: 更新 Member Alerts 與 Contracts 頁面

**Files:**
- Modify: `resources/js/Pages/Member/Alerts/Index.tsx`
- Modify: `resources/js/Pages/Member/Contracts/Index.tsx`

- [ ] **Step 1: 更新 Alerts 頁面**

```tsx
import { Banner } from '@/components/ui/banner'

// 替換：
{props.error ? (
  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
    {t(props.error.key, props.error.params)}
  </div>
) : null}

// 為：
{props.error && (
  <Banner 
    tone={props.error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'} 
    message={t(props.error.key, props.error.params)} 
  />
)}
```

- [ ] **Step 2: 更新 Contracts 頁面**

```tsx
import { Banner } from '@/components/ui/banner'

// 替換：
{error && (
  <div className="rounded-md border border-destructive p-4 text-destructive">
    {t(error.key, error.params)}
  </div>
)}

// 為：
{error && (
  <Banner 
    tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'} 
    message={t(error.key, error.params)} 
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Member/Alerts/Index.tsx resources/js/Pages/Member/Contracts/Index.tsx
git commit -m "style: [member] 統一 Alerts 與 Contracts 頁面的提示樣式"
```

---

### Task 7: 最終驗證

- [ ] **Step 1: 執行類型檢查**

Run: `bun tsc --noEmit --skipLibCheck`
Expected: 沒有新的 TypeScript 錯誤

- [ ] **Step 2: 巡檢所有修改過的頁面**
確認 `Banner` 的匯入與使用皆正確。

# shadcn UI 元件重構計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將自訂的 `Banner` 元件與手寫的 Tab/錯誤 UI 遷移至 shadcn/ui 標準元件，並清理 `space-y-*` → `flex gap-*` 的間距模式。

**Architecture:** 安裝缺失的 shadcn 元件（alert、tabs）後，在 `alert.tsx` 加入 `warning` 與 `info` 兩種 variant，再逐頁替換 Banner 使用處。最後將 Alerts 頁面的手寫 button tab 改為 shadcn `Tabs`，並將認證表單的 `space-y-*` 遷移至 `flex flex-col gap-*`。

**Tech Stack:** React 18, Vite, TypeScript (strict), shadcn/ui (style: default, base: radix), Tailwind CSS v3, Vitest (node env), `npx shadcn@latest` CLI

---

## 檔案異動清單

| 動作 | 路徑 |
|------|------|
| 新增 (CLI) | `resources/js/components/ui/alert.tsx` |
| 新增 (CLI) | `resources/js/components/ui/tabs.tsx` |
| 修改 | `resources/js/components/ui/alert.tsx` — 加入 warning/info variants |
| 刪除 | `resources/js/components/ui/banner.tsx` |
| 修改 | `resources/js/Pages/Member/Contracts/Index.tsx` |
| 修改 | `resources/js/Pages/Member/ApiKeys/Index.tsx` |
| 修改 | `resources/js/Pages/Member/Usage/Index.tsx` |
| 修改 | `resources/js/Pages/Member/CostBreakdown/Index.tsx` |
| 修改 | `resources/js/Pages/Member/Alerts/Index.tsx` |
| 修改 | `resources/js/Pages/Member/Dashboard/Index.tsx` |
| 修改 | `resources/js/Pages/Manager/Members/Index.tsx` |
| 修改 | `resources/js/Pages/Auth/Login.tsx` |
| 修改 | `resources/js/Pages/Auth/Register.tsx` |

---

## Task 1：安裝 shadcn alert 與 tabs 元件

**Files:**
- Create: `resources/js/components/ui/alert.tsx`
- Create: `resources/js/components/ui/tabs.tsx`

- [ ] **Step 1: 安裝 alert 和 tabs**

```bash
npx shadcn@latest add alert tabs --cwd /Users/carl/Dev/CMG/Draupnir
```

預期輸出：兩個檔案出現在 `resources/js/components/ui/`

- [ ] **Step 2: 確認檔案存在**

```bash
ls resources/js/components/ui/alert.tsx resources/js/components/ui/tabs.tsx
```

預期：兩個路徑都正常輸出（不報錯）

- [ ] **Step 3: TypeScript 型別檢查**

```bash
npx tsc --noEmit
```

預期：0 errors

- [ ] **Step 4: commit**

```bash
git add resources/js/components/ui/alert.tsx resources/js/components/ui/tabs.tsx
git commit -m "feat: [ui] 安裝 shadcn alert 和 tabs 元件"
```

---

## Task 2：在 alert.tsx 加入 warning 與 info variants

`banner.tsx` 有三種 tone（`warning`、`destructive`、`info`），而 shadcn Alert 預設只有 `default` 和 `destructive`。本 task 擴充 alert.tsx 的 CVA variants。

**Files:**
- Modify: `resources/js/components/ui/alert.tsx`

- [ ] **Step 1: 讀取目前的 alert.tsx**

開啟 `resources/js/components/ui/alert.tsx`，找到 `alertVariants` 的 `cva(...)` 呼叫。它的 `variants.variant` 目前應該只有 `default` 和 `destructive` 兩個 key。

- [ ] **Step 2: 加入 warning 和 info variants**

在 `alertVariants` 的 `variants.variant` 物件內，緊接在 `destructive:` 行之後加入：

```tsx
warning:
  "border-amber-500/20 bg-amber-500/10 text-amber-400 [&>svg]:text-amber-400",
info:
  "border-indigo-500/20 bg-indigo-500/10 text-indigo-400 [&>svg]:text-indigo-400",
```

同時更新 `AlertProps` 的 TypeScript type（如果該型別是從 `VariantProps<typeof alertVariants>` 推導，則無需手動更新；如果是手寫 union，加入 `"warning" | "info"`）。

完成後 `alertVariants` 應看起來類似：

```tsx
const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-400 [&>svg]:text-amber-400",
        info:
          "border-indigo-500/20 bg-indigo-500/10 text-indigo-400 [&>svg]:text-indigo-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

- [ ] **Step 3: TypeScript 型別檢查**

```bash
npx tsc --noEmit
```

預期：0 errors

- [ ] **Step 4: commit**

```bash
git add resources/js/components/ui/alert.tsx
git commit -m "feat: [ui] 在 alert 元件加入 warning 和 info variants"
```

---

## Task 3：遷移 Member 簡單 Banner 頁面（Contracts / ApiKeys / Usage）

這三頁的 Banner 用法完全相同：根據 `error.key` 結尾動態選擇 `warning` 或 `destructive` tone，無 `title` prop。

**Files:**
- Modify: `resources/js/Pages/Member/Contracts/Index.tsx`
- Modify: `resources/js/Pages/Member/ApiKeys/Index.tsx`
- Modify: `resources/js/Pages/Member/Usage/Index.tsx`

### Contracts/Index.tsx

- [ ] **Step 1: 更新 import**

移除：
```tsx
import { Banner } from '@/components/ui/banner'
```

加入：
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'
```

- [ ] **Step 2: 替換 Banner JSX**

找到（行 ~27）：
```tsx
{error && (
  <Banner
    tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}
    message={t(error.key, error.params)}
  />
)}
```

替換為：
```tsx
{error && (
  <Alert variant={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}>
    {error.key.endsWith('.selectOrg') ? (
      <AlertTriangle className="size-4" />
    ) : (
      <AlertCircle className="size-4" />
    )}
    <AlertDescription>{t(error.key, error.params)}</AlertDescription>
  </Alert>
)}
```

### ApiKeys/Index.tsx

- [ ] **Step 3: 更新 import（ApiKeys）**

移除：
```tsx
import { Banner } from '@/components/ui/banner'
```

加入：
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'
```

（注意：`lucide-react` 的 `AlertCircle` 可能已被 import，檢查後合併，不重複引入）

- [ ] **Step 4: 替換 Banner JSX（ApiKeys）**

找到（行 ~54）：
```tsx
{error && (
  <Banner
    tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}
    message={t(error.key, error.params)}
  />
)}
```

替換為：
```tsx
{error && (
  <Alert variant={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}>
    {error.key.endsWith('.selectOrg') ? (
      <AlertTriangle className="size-4" />
    ) : (
      <AlertCircle className="size-4" />
    )}
    <AlertDescription>{t(error.key, error.params)}</AlertDescription>
  </Alert>
)}
```

### Usage/Index.tsx

- [ ] **Step 5: 更新 import（Usage）**

移除：
```tsx
import { Banner } from '@/components/ui/banner'
```

加入：
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'
```

- [ ] **Step 6: 替換 Banner JSX（Usage）**

找到（行 ~33）：
```tsx
{error && (
  <Banner
    tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}
    message={t(error.key, error.params)}
    className="mb-6"
  />
)}
```

替換為：
```tsx
{error && (
  <Alert
    variant={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}
    className="mb-6"
  >
    {error.key.endsWith('.selectOrg') ? (
      <AlertTriangle className="size-4" />
    ) : (
      <AlertCircle className="size-4" />
    )}
    <AlertDescription>{t(error.key, error.params)}</AlertDescription>
  </Alert>
)}
```

- [ ] **Step 7: TypeScript 型別檢查**

```bash
npx tsc --noEmit
```

預期：0 errors

- [ ] **Step 8: commit**

```bash
git add \
  resources/js/Pages/Member/Contracts/Index.tsx \
  resources/js/Pages/Member/ApiKeys/Index.tsx \
  resources/js/Pages/Member/Usage/Index.tsx
git commit -m "refactor: [member] 遷移 Contracts/ApiKeys/Usage 的 Banner 至 shadcn Alert"
```

---

## Task 4：遷移 Dashboard + CostBreakdown（含 title prop 和 fetchError）

這兩頁各有兩個 Banner：一個帶 `title` prop 的 error，一個無 title 的 `fetchError`。

**Files:**
- Modify: `resources/js/Pages/Member/CostBreakdown/Index.tsx`
- Modify: `resources/js/Pages/Member/Dashboard/Index.tsx`

### CostBreakdown/Index.tsx

- [ ] **Step 1: 更新 import（CostBreakdown）**

移除：
```tsx
import { Banner } from '@/components/ui/banner'
```

加入：
```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'
```

- [ ] **Step 2: 替換兩個 Banner（CostBreakdown）**

找到（行 ~203-209）：
```tsx
{error && (
  <Banner
    tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}
    title="Organization"
    message={t(error.key, error.params)}
  />
)}
{fetchError && <Banner tone="destructive" title="Analytics" message={fetchError} />}
```

替換為：
```tsx
{error && (
  <Alert variant={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}>
    {error.key.endsWith('.selectOrg') ? (
      <AlertTriangle className="size-4" />
    ) : (
      <AlertCircle className="size-4" />
    )}
    <AlertTitle>Organization</AlertTitle>
    <AlertDescription>{t(error.key, error.params)}</AlertDescription>
  </Alert>
)}
{fetchError && (
  <Alert variant="destructive">
    <AlertCircle className="size-4" />
    <AlertTitle>Analytics</AlertTitle>
    <AlertDescription>{fetchError}</AlertDescription>
  </Alert>
)}
```

### Dashboard/Index.tsx

- [ ] **Step 3: 更新 import（Dashboard）**

移除：
```tsx
import { Banner } from '@/components/ui/banner'
```

加入：
```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'
```

- [ ] **Step 4: 替換兩個 Banner（Dashboard）**

找到（行 ~181-187）：
```tsx
{error && (
  <Banner
    tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}
    title="Organization"
    message={t(error.key, error.params)}
  />
)}
{fetchError && <Banner tone="destructive" title="Analytics" message={fetchError} />}
```

替換為：
```tsx
{error && (
  <Alert variant={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}>
    {error.key.endsWith('.selectOrg') ? (
      <AlertTriangle className="size-4" />
    ) : (
      <AlertCircle className="size-4" />
    )}
    <AlertTitle>Organization</AlertTitle>
    <AlertDescription>{t(error.key, error.params)}</AlertDescription>
  </Alert>
)}
{fetchError && (
  <Alert variant="destructive">
    <AlertCircle className="size-4" />
    <AlertTitle>Analytics</AlertTitle>
    <AlertDescription>{fetchError}</AlertDescription>
  </Alert>
)}
```

- [ ] **Step 5: TypeScript 型別檢查**

```bash
npx tsc --noEmit
```

預期：0 errors

- [ ] **Step 6: commit**

```bash
git add \
  resources/js/Pages/Member/CostBreakdown/Index.tsx \
  resources/js/Pages/Member/Dashboard/Index.tsx
git commit -m "refactor: [member] 遷移 Dashboard/CostBreakdown 的 Banner 至 shadcn Alert"
```

---

## Task 5：重構 Alerts 頁面（Banner + 手寫 tabs → shadcn Tabs）

此頁同時有 Banner 遷移和 Tab 重構兩個工作。現有 tab 實作用 `useState` + 手動 className 拼接；遷移後使用 shadcn `Tabs`（uncontrolled），可完全移除 `useState` 和 `tabLabel`。

**Files:**
- Modify: `resources/js/Pages/Member/Alerts/Index.tsx`

- [ ] **Step 1: 更新 import**

移除：
```tsx
import { useState } from 'react'
import { Banner } from '@/components/ui/banner'
```

加入：
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
```

- [ ] **Step 2: 移除 useState 和 tabLabel**

移除整個 `useState` 和 `tabLabel` 函式：
```tsx
// 刪除這兩段
const [tab, setTab] = useState<AlertsTab>('budgets')

const tabLabel = (item: AlertsTab) => {
  if (item === 'budgets') return t('ui.member.alerts.tab.budgets')
  if (item === 'webhooks') return t('ui.member.alerts.tab.webhooks')
  return t('ui.member.alerts.tab.history')
}
```

同時確認 `AlertsTab` type import：若它只用在 `useState` 的泛型，則一併移除。

- [ ] **Step 3: 替換 Banner JSX**

找到（行 ~53-57）：
```tsx
{props.error && (
  <Banner
    tone={props.error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}
    message={t(props.error.key, props.error.params)}
  />
)}
```

替換為：
```tsx
{props.error && (
  <Alert variant={props.error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}>
    {props.error.key.endsWith('.selectOrg') ? (
      <AlertTriangle className="size-4" />
    ) : (
      <AlertCircle className="size-4" />
    )}
    <AlertDescription>{t(props.error.key, props.error.params)}</AlertDescription>
  </Alert>
)}
```

- [ ] **Step 4: 替換手寫 tab UI 為 shadcn Tabs**

找到 `<CardContent>` 內整個 tab 區塊（手寫 button 迴圈 + 三個條件渲染）：
```tsx
<div className="flex flex-wrap gap-2 rounded-2xl bg-muted/50 p-2">
  {(['budgets', 'webhooks', 'history'] as const).map((item) => (
    <button
      key={item}
      type="button"
      onClick={() => setTab(item)}
      className={[
        'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
        tab === item
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {tabLabel(item)}
    </button>
  ))}
</div>

{tab === 'budgets' ? (
  <BudgetsTab orgId={props.orgId ?? ''} initial={props.budget} />
) : null}
{tab === 'webhooks' ? (
  <WebhooksTab orgId={props.orgId ?? ''} initial={props.webhookEndpoints} />
) : null}
{tab === 'history' ? (
  <HistoryTab orgId={props.orgId ?? ''} initial={props.alertHistory} />
) : null}
```

替換為：
```tsx
<Tabs defaultValue="budgets">
  <TabsList className="flex-wrap rounded-2xl bg-muted/50 p-2">
    <TabsTrigger value="budgets" className="rounded-xl">
      {t('ui.member.alerts.tab.budgets')}
    </TabsTrigger>
    <TabsTrigger value="webhooks" className="rounded-xl">
      {t('ui.member.alerts.tab.webhooks')}
    </TabsTrigger>
    <TabsTrigger value="history" className="rounded-xl">
      {t('ui.member.alerts.tab.history')}
    </TabsTrigger>
  </TabsList>
  <TabsContent value="budgets">
    <BudgetsTab orgId={props.orgId ?? ''} initial={props.budget} />
  </TabsContent>
  <TabsContent value="webhooks">
    <WebhooksTab orgId={props.orgId ?? ''} initial={props.webhookEndpoints} />
  </TabsContent>
  <TabsContent value="history">
    <HistoryTab orgId={props.orgId ?? ''} initial={props.alertHistory} />
  </TabsContent>
</Tabs>
```

同時移除 `<CardContent>` 上的 `space-y-6`（`Tabs` 已自帶間距結構）：
```tsx
// Before
<CardContent className="space-y-6 p-4 sm:p-6">
// After
<CardContent className="p-4 sm:p-6">
```

- [ ] **Step 5: TypeScript 型別檢查**

```bash
npx tsc --noEmit
```

預期：0 errors

- [ ] **Step 6: commit**

```bash
git add resources/js/Pages/Member/Alerts/Index.tsx
git commit -m "refactor: [alerts] 遷移 Banner 至 Alert，手寫 tabs 改為 shadcn Tabs"
```

---

## Task 6：清理 banner.tsx 並修復 Manager/Members 自訂錯誤 div

**Files:**
- Delete: `resources/js/components/ui/banner.tsx`
- Modify: `resources/js/Pages/Manager/Members/Index.tsx`

- [ ] **Step 1: 確認 banner.tsx 無剩餘 import**

```bash
grep -r "from '@/components/ui/banner'" resources/js --include="*.tsx"
```

預期：無任何輸出。若仍有輸出，先完成該頁面的遷移再繼續。

- [ ] **Step 2: 刪除 banner.tsx**

```bash
rm resources/js/components/ui/banner.tsx
```

- [ ] **Step 3: 更新 Manager/Members import**

開啟 `resources/js/Pages/Manager/Members/Index.tsx`，加入（若不存在）：
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
```

（注意：`AlertCircle` 可能已被 import，確認不重複引入）

- [ ] **Step 4: 替換自訂錯誤 div（Manager/Members）**

找到（行 ~404-410）：
```tsx
{error && (
  <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium flex items-center gap-2">
    <AlertCircle className="h-4 w-4" />
    {t('ui.manager.members.loadFailedBanner')}
  </div>
)}
```

替換為：
```tsx
{error && (
  <Alert variant="destructive">
    <AlertCircle className="size-4" />
    <AlertDescription>{t('ui.manager.members.loadFailedBanner')}</AlertDescription>
  </Alert>
)}
```

- [ ] **Step 5: TypeScript 型別檢查**

```bash
npx tsc --noEmit
```

預期：0 errors

- [ ] **Step 6: commit**

```bash
git add resources/js/components/ui/banner.tsx resources/js/Pages/Manager/Members/Index.tsx
git commit -m "refactor: [ui] 刪除 banner.tsx，清理 Manager/Members 自訂錯誤 div"
```

---

## Task 7：遷移認證表單間距（space-y → flex gap）

認證表單（Login、Register）使用 `space-y-*` 排版，應改為 `flex flex-col gap-*`。此外，這兩頁的內嵌錯誤/成功訊息 div 也可遷移至 shadcn Alert。

**Files:**
- Modify: `resources/js/Pages/Auth/Login.tsx`
- Modify: `resources/js/Pages/Auth/Register.tsx`

### Login.tsx

- [ ] **Step 1: 更新 import（Login）**

加入：
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
```

- [ ] **Step 2: 替換 Login 的 flash/error inline divs**

找到：
```tsx
{flash?.success && (
  <div className="rounded-md bg-emerald-600/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
    {t(flash.success.key, flash.success.params)}
  </div>
)}
{error && (
  <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
    {t(error.key, error.params)}
  </div>
)}
```

替換為：
```tsx
{flash?.success && (
  <Alert variant="info">
    <CheckCircle2 className="size-4" />
    <AlertDescription>{t(flash.success.key, flash.success.params)}</AlertDescription>
  </Alert>
)}
{error && (
  <Alert variant="destructive">
    <AlertCircle className="size-4" />
    <AlertDescription>{t(error.key, error.params)}</AlertDescription>
  </Alert>
)}
```

- [ ] **Step 3: 遷移 Login 表單間距**

找到：
```tsx
<form onSubmit={handleSubmit} className="space-y-4">
```
改為：
```tsx
<form onSubmit={handleSubmit} className="flex flex-col gap-4">
```

找到所有欄位包裝（共 2 個）：
```tsx
<div className="space-y-2">
```
改為：
```tsx
<div className="flex flex-col gap-2">
```

### Register.tsx

- [ ] **Step 4: 更新 import（Register）**

加入：
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
```

- [ ] **Step 5: 替換 Register 的 error inline div**

找到：
```tsx
{error && (
  <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
    {t(error.key, error.params)}
  </div>
)}
```

替換為：
```tsx
{error && (
  <Alert variant="destructive">
    <AlertCircle className="size-4" />
    <AlertDescription>{t(error.key, error.params)}</AlertDescription>
  </Alert>
)}
```

- [ ] **Step 6: 遷移 Register 表單間距**

找到：
```tsx
<form onSubmit={handleSubmit} className="space-y-4">
```
改為：
```tsx
<form onSubmit={handleSubmit} className="flex flex-col gap-4">
```

找到所有欄位包裝（約 4 個 `<div className="space-y-2">`），全部改為：
```tsx
<div className="flex flex-col gap-2">
```

找到密碼驗證規則清單：
```tsx
<ul className="text-xs text-muted-foreground space-y-1 mt-1">
```
改為：
```tsx
<ul className="text-xs text-muted-foreground flex flex-col gap-1 mt-1">
```

- [ ] **Step 7: TypeScript 型別檢查**

```bash
npx tsc --noEmit
```

預期：0 errors

- [ ] **Step 8: commit**

```bash
git add \
  resources/js/Pages/Auth/Login.tsx \
  resources/js/Pages/Auth/Register.tsx
git commit -m "refactor: [auth] 遷移表單間距至 flex gap，inline 錯誤訊息改用 shadcn Alert"
```

---

## 視覺驗證清單

完成所有 task 後，啟動開發伺服器並逐一確認：

```bash
npm run dev
```

| 頁面 | 驗證項目 |
|------|---------|
| Member > Contracts | 切換無組織帳號，確認 warning Alert 顯示正確 |
| Member > ApiKeys | 同上 |
| Member > Usage | 確認 Alert 有 `mb-6` 間距 |
| Member > CostBreakdown | error + fetchError 兩個 Alert 分別顯示 |
| Member > Dashboard | 同上 |
| Member > Alerts | Tab 切換正常，3 個內容面板切換無誤；Banner 替換正確 |
| Manager > Members | 載入失敗時出現 destructive Alert |
| Auth > Login | 成功訊息為 info Alert，錯誤訊息為 destructive Alert |
| Auth > Register | 錯誤訊息為 destructive Alert，表單欄位間距正常 |

---

## Self-Review

### Spec coverage
- ✅ Phase 1：安裝缺失元件（alert、tabs）→ Task 1
- ✅ Phase 2：Banner → Alert（6 頁 + 1 自訂 div）→ Task 2-6
- ✅ Phase 3：Alerts Tabs 重構 → Task 5
- ✅ Phase 4：Auth 表單 space-y 遷移 → Task 7
- ⚠️ Phase 5（圖表）：列為未來工作，不在本計畫範圍

### Placeholder scan
無 TBD/TODO/placeholders。所有步驟均含完整程式碼。

### Type consistency
- `Alert` variant 新增 `warning` / `info` 在 Task 2 完成；Task 3-7 均使用這些 variant。
- `AlertDescription`、`AlertTitle` 從 `@/components/ui/alert` import，命名一致。
- icon 使用 `className="size-4"` 格式（符合 shadcn 規則，取代 `h-4 w-4`）。

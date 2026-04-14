# 前端 i18n 設計文件

**日期**：2026-04-14  
**狀態**：已審核，待實作

---

## 背景與目標

Draupnir 後端已有完整的 i18n catalog（`loadMessages.ts`），並透過 Inertia shared props 將 `messages` 與 `locale` 傳遞給前端。然而前端頁面目前：

1. 所有 UI 靜態文字（標題、按鈕、標籤、空狀態說明）全部硬編碼在 TSX
2. 沒有統一的 `t()` 調用入口
3. Page handler 以預翻字串（`messages['key']`）當作 props 傳前端，責任邊界模糊

**目標**：在零新增依賴的前提下，建立前端 i18n 基礎設施，讓所有使用者可見文案統一走 `t()` 調度，後端只負責傳 key，前端負責翻譯。

---

## 核心原則

1. **`createTranslator(messages)` 是唯一翻譯核心**，`useTranslation()` 只是 React 包裝
2. **zh-TW 是 canonical key set**，其他 locale 必須擁有完全相同的 key 集合
3. **前端負責所有 UI 文案翻譯**，後端不承擔頁面 UI 預翻責任
4. **禁止預翻字串**、禁止 key / 字串混用、禁止附帶 fallback 文案
5. **所有 server → client 使用者可見文案**，一律傳 `MessageKey` 或 `I18nMessage`

---

## 架構概覽

```
loadMessages.ts  (擴充 ui.* key，zh-TW + en)
  └─ 後端：injectSharedData() → Inertia shared props { messages, locale }
                                                       ↓
resources/js/lib/i18n.ts  (新增)
  ├── MessageKey             = keyof catalogs['zh-TW']  (TypeScript union，自動推導)
  ├── I18nMessage            = { key: MessageKey; params?: Record<string, string | number> }
  ├── createTranslator(messages) → t(key, params?)      (唯一翻譯核心)
  └── useTranslation()           → { t, locale }        (React 包裝)
                                                       ↓
  TSX pages / components 呼叫 useTranslation() 取得 t()
  helper / column 定義呼叫 createTranslator(messages)
```

---

## 型別定義

```typescript
// 從後端 catalog 自動推導，zh-TW 為 canonical
export type MessageKey = keyof (typeof catalogs)['zh-TW']

// 統一文案 payload
export interface I18nMessage {
  key: MessageKey
  params?: Record<string, string | number>
}

export type Messages = Record<MessageKey, string>
```

### `createTranslator`

```typescript
type Translator = (
  key: MessageKey,
  params?: Record<string, string | number>
) => string

export function createTranslator(messages: Partial<Messages>): Translator {
  return function t(
    key: MessageKey,
    params?: Record<string, string | number>
  ): string {
    const raw = messages[key]
    const value = raw !== undefined ? raw : key

    if (raw === undefined && process.env.NODE_ENV !== 'production') {
      console.warn(`[i18n] Missing translation key: "${key}"`)
    }

    if (!params) return value

    // 僅支援簡單 {param} 插值（不支援 ICU / plural / format）
    return value.replace(/\{(\w+)\}/g, (_, k) =>
      String(params[k] ?? `{${k}}`)
    )
  }
}
```

- key 存在 → 回傳翻譯值（含 params 插值）
- key 不存在，dev → `console.warn` + 回傳 key
- key 不存在，production → 靜默回傳 key
- 無 fallback 參數（禁止傳 fallback 文案）

> 注意：production 環境回傳 key 僅為容錯行為，不視為正常 fallback 機制。  
> 缺失的 translation key 必須在開發與測試階段修正。

### `useTranslation`

```typescript
import { useMemo } from 'react'

export function useTranslation() {
  const { messages, locale } = usePage<InertiaSharedData>().props

  const t = useMemo(() => createTranslator(messages), [messages])

  return { t, locale }
}
```

---

## Catalog 擴充策略

### Key 命名規範

現有後端 key（保留，不改名）：

```
auth.logout.unauthorized
admin.contracts.loadFailed
member.dashboard.selectOrg
```

新增前端 UI key，使用 `ui.*` 命名空間：

```
ui.common.save
ui.common.cancel
ui.common.loading
ui.common.create
ui.common.back
ui.admin.contracts.title
ui.admin.contracts.create
ui.member.dashboard.title
ui.member.dashboard.balance
...
```

`ui.*` 命名空間讓開發者一眼分辨 UI copy 與業務邏輯訊息。

### Key 結構規範（強制）

`ui.*` key 必須對齊 page / component 結構，避免平面化擴張：

```
ui.admin.contracts.index.title
ui.admin.contracts.index.createButton
ui.member.dashboard.index.balance
```

原則：

- key 應能對應到實際檔案或 component
- 避免過度抽象或無語意命名（如 `ui.common.text1`）

### zh-TW 為 canonical

`MessageKey` 的型別推導必須來自前後端皆可引用的共享 catalog 型別來源；若現有 `loadMessages.ts` 僅供後端 runtime 使用，需額外抽出 shared catalog type module 或 shared catalog definition。

`MessageKey` 從 `catalogs['zh-TW']` 推導。TypeScript 滿足性檢查確保 `en` catalog 的 key 集合與 zh-TW 完全一致：

```typescript
const catalogs = {
  'zh-TW': { ... } as const,
  en: { ... } satisfies Record<keyof (typeof catalogs)['zh-TW'], string>,
}
```

### 插值限制

目前僅支援 `{param}` 形式的簡單字串插值：

```
"ui.welcome": "Hello, {name}"
```


不支援：

- ICU message syntax（plural / select）
- 日期 / 數字格式化
- 巢狀結構

若未來需要上述能力，需重新設計 formatter 層。

---

## InertiaSharedData 調整

```typescript
export interface InertiaSharedData {
  csrfToken: string
  auth: { user: { id: string; email: string; role: string } | null }
  currentOrgId: string | null
  locale: LocaleCode
  messages: Partial<Messages>   // ← 改為 Partial<Messages>，見下方說明
  flash: {
    success?: I18nMessage
    error?: I18nMessage
  }
}
```

Flash 消費範例（前端）：

```typescript
const { t } = useTranslation()
const { flash } = usePage<InertiaSharedData>().props
if (flash.error) toast.error(t(flash.error.key, flash.error.params))
```

### 為何使用 `Partial<Messages>` 而非 `Messages`

`InertiaSharedData` 是傳輸邊界 DTO，而非 catalog 完整性合約：

- `getInertiaShared()` 的 safe default 回傳 `messages: {}`，
  若使用 total type `Messages`，測試與非 Inertia 呼叫者需要 unsafe cast。
- Catalog 完整性（所有 key 都必須存在）由 `loadMessages()` 在後端載入階段保證，
  並透過 `en satisfies Record<keyof ..., string>` 在編譯期驗證。
- 前端 `createTranslator(messages)` 已有容錯行為（key 不存在 → dev warn + 回傳 key），
  因此 partial type 在 runtime 安全。

**結論**：在 DTO 邊界使用 `Partial<Messages>`，在 `loadMessages()` 出口保證完整性。

---

## 後端／前端責任邊界

| 類型 | 傳遞方式 | 誰翻譯 |
|------|----------|--------|
| 頁面標題、按鈕、標籤、空狀態 | 前端直接 `t()` | 前端 |
| 前端即時驗證錯誤 | Zod schema 定義 key，前端 `t()` | 前端 |
| 後端提交後驗證錯誤 | `{ errors: Record<string, MessageKey> }`（每欄位單一 key） | 前端 `t(key)` |
| 業務錯誤 | `{ error: I18nMessage }` prop | 前端 `t(error.key)` |
| Flash message | `flash: { success?: I18nMessage; error?: I18nMessage }` | 前端 `t(key)` |

### 禁止模式

```typescript
// ❌ 禁止：後端預翻字串直接當 prop
error: messages['member.dashboard.selectOrg']

// ❌ 禁止：key / 字串混用
{ errorKey: 'some.key', message: '已翻好的字串' }

// ❌ 禁止：附帶 fallback 文案
t('some.key', '預設文字')  // createTranslator 不支援此 signature

// ✅ 正確：永遠傳 key 或 I18nMessage
error: { key: 'member.dashboard.selectOrg' }
```

### 型別約束（強制）

所有 固定文案型 user-visible props（例如 title、description、emptyState、actionLabel、error、flash）不得使用 string；僅允許 `MessageKey` 或 `I18nMessage`。
使用者資料、資料庫內容、API 回傳內容等動態值不在此限制內。

---

## Flash 與訊息遷移

### 現況

現有後端 flash 機制以原始字串寫入 cookie：

```typescript
// 現況：原始字串 cookie
ctx.setCookie('flash:success', '操作成功', { path: '/', sameSite: 'Lax' })
ctx.setCookie('flash:error', messages['member.dashboard.selectOrg'], ...)
```

`getInertiaShared()` 透過 `readFlash()` 讀取這些 cookie 並以 `string | undefined` 回傳。
現有 Page handler 也直接使用 `result.message`（原始字串）作為 prop。

### 目標 wire format

最終 flash prop 型別為：

```typescript
flash: {
  success?: I18nMessage   // { key: MessageKey; params?: Record<string, string | number> }
  error?: I18nMessage
}
```

### 遷移路徑（分三步）

#### Step A — 定義結構化 flash cookie 格式

以 JSON 序列化 `I18nMessage`，保留向下相容解析：

```typescript
// 寫入（後端）
function setFlash(ctx: IHttpContext, type: 'success' | 'error', msg: I18nMessage): void {
  ctx.setCookie(`flash:${type}`, encodeURIComponent(JSON.stringify(msg)), {
    path: '/', maxAge: 60, sameSite: 'Lax',
  })
}

// 讀取（SharedPropsBuilder readFlash 擴充）
function parseFlash(raw: string): I18nMessage | string {
  try {
    const decoded = decodeURIComponent(raw)
    const parsed = JSON.parse(decoded)
    if (parsed?.key) return parsed as I18nMessage
  } catch {}
  return raw  // 向下相容：舊格式仍回傳原始字串（過渡期）
}
```

過渡期間，`InertiaSharedData.flash` 暫時接受 `I18nMessage | string`；
待全部呼叫端遷移後，收斂為純 `I18nMessage`。

#### Step B — 建立 error-code → MessageKey 映射層

現有 page handler 常見模式：

```typescript
// 現況：直接使用業務錯誤訊息字串
const result = await someService.execute(...)
if (!result.ok) {
  return render({ error: result.message })  // ← 原始字串
}
```

引入 `toI18nMessage` 轉換函式：

```typescript
// 新增：src/Shared/Presentation/toI18nMessage.ts
const ERROR_CODE_MAP: Record<string, MessageKey> = {
  'MEMBER_SELECT_ORG': 'member.dashboard.selectOrg',
  'ADMIN_CONTRACT_NOT_FOUND': 'admin.contracts.missingId',
  // ... 逐步補全
}

export function toI18nMessage(
  codeOrMessage: string,
  params?: Record<string, string | number>,
): I18nMessage {
  const key = ERROR_CODE_MAP[codeOrMessage] ?? codeOrMessage as MessageKey
  return { key, params }
}
```

Page handler 遷移：

```typescript
// 遷移後
if (!result.ok) {
  return render({ error: toI18nMessage(result.errorCode) })
}
```

#### Step C — 型別約束收斂

當所有 page handler 與 flash 呼叫端遷移完成後：

1. `InertiaSharedData.flash` 確認為純 `I18nMessage`（移除過渡期 `| string`）
2. `InertiaSharedData.messages` 保持 `Partial<Messages>`（transport 邊界不變）
3. 移除 `toI18nMessage` 中的 `ERROR_CODE_MAP` 向下相容路徑，改為編譯期強型別

### 遷移優先順序

| 階段 | 範圍 | 標準 |
|------|------|------|
| Step A | `SharedPropsBuilder.ts` + 高頻 flash 設定點 | Flash cookie 改 JSON |
| Step B | 現有 page handler（逐檔） | `error: result.message` → `toI18nMessage` |
| Step C | 型別收斂 | 確認無 `string` 殘留於 flash / error props |

---

## 遷移計畫

### Phase 0 — Flash Wire Format 遷移（前置）

詳見 [Flash 與訊息遷移](#flash-與訊息遷移) Step A。  
**必須先於 Phase 1 完成**，以確保 `InertiaSharedData.flash` 的結構化格式就位。

### Phase 1 — 基礎設施

- 新增 `resources/js/lib/i18n.ts`（`createTranslator`、`useTranslation`、型別）
- 調整 `loadMessages.ts`：`as const` 確保型別推導，`en` 加上 `satisfies` 對齊 zh-TW
- `InertiaSharedData.flash` 改為 `I18nMessage` shape
- 匯出 `MessageKey`、`Messages`、`I18nMessage` 型別供全專案使用

### Phase 2 — 後端遷移

- 現有 page handler 的 `error: messages['key']` 全部改為 `error: { key: '...' }`
- 現有 page handler 的 `error: result.message` 透過 `toI18nMessage()` 轉換
  （詳見 [Flash 與訊息遷移](#flash-與訊息遷移) Step B）
- 後端提交後驗證改回傳 `{ errors: Record<string, MessageKey> }`
- 進入 code review checklist：禁止預翻字串、禁止混用

### Phase 3 — 前端遷移

- 所有 TSX 硬編碼 UI 字串改用 `t()`，同步補 catalog key
- 收斂殘留的 `errorKey: string` 欄位為 `I18nMessage`
- 移除 page handler 中剩餘的 `messages['key']` 用法

---

## 測試策略

| 層級 | 測試目標 | 工具 |
|------|----------|------|
| `createTranslator` 單元 | key 存在回正確值；缺 key dev warn + 回 key；params 插值正確 | Vitest |
| Catalog 完整性 | zh-TW 與 en key 集合一致（TypeScript 滿足性 + 編譯期驗證） | tsc |
| `useTranslation` hook | 從 mock `usePage` props 正確讀取 messages | Vitest + @testing-library/react |
| Page handler 整合 | props 中無預翻字串（`error` 欄位為 `I18nMessage` 型別） | 現有測試架構 |

---

## 檔案清單

| 動作 | 路徑 |
|------|------|
| 新增 | `resources/js/lib/i18n.ts` |
| 修改 | `src/Shared/Infrastructure/I18n/loadMessages.ts` |
| 修改 | `src/Website/Http/Inertia/SharedPropsBuilder.ts` |
| 修改（逐步） | `src/Website/*/Pages/*.ts`（Phase 2） |
| 修改（逐步） | `resources/js/Pages/**/*.tsx`（Phase 3） |

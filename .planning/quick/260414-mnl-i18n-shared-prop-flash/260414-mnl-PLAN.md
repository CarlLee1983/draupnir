---
quick_id: 260414-mnl
slug: i18n-shared-prop-flash
type: quick
autonomous: true
files_modified:
  - docs/superpowers/specs/2026-04-14-frontend-i18n-design.md
---

<objective>
修正 i18n 設計文件的兩個 HIGH 嚴重性問題：

1. `InertiaSharedData.messages` 的型別從 `Messages`（total type）改為 `Partial<Messages>`，
   讓非 Inertia/測試呼叫者的 `getInertiaShared()` 回傳值能通過型別檢查。
2. 新增 flash / 字串遷移章節，說明結構化 flash wire format、
   error-code → MessageKey 映射層、以及從原始字串漸進遷移到型別化 key 的路徑。

Output: 更新後的 `docs/superpowers/specs/2026-04-14-frontend-i18n-design.md`
</objective>

<context>
## 現況理解

### SharedPropsBuilder.ts 現況
- `InertiaSharedData.messages` 目前型別為 `Record<string, string>`（寬型別）
- `getInertiaShared()` 的 safe default 回傳 `messages: {}`（空物件）
- `flash.success / flash.error` 目前為 `string | undefined`（從 cookie 讀取的原始字串）
- `injectSharedData()` 呼叫 `loadMessages(locale)` 回傳完整 catalog

### loadMessages.ts 現況
- 回傳型別：`Record<string, string>`（不是 total type）
- 使用 Proxy：key 不存在時回傳 key 本身（容錯行為）
- catalogs 為 `as const`，zh-TW 有 ~30 個既有業務 key

### 設計文件現況問題
1. `InertiaSharedData.messages: Messages` — `Messages = Record<MessageKey, string>` 是 total type，
   但 `getInertiaShared()` 的 fallback 回傳 `messages: {}` 無法滿足此型別
2. Flash 仍為原始字串 cookie（`flash:success`、`flash:error`），
   文件要求 `flash: { success?: I18nMessage; error?: I18nMessage }` 但無遷移路徑
</context>

<tasks>

## Task 1 — 修正 `InertiaSharedData.messages` 型別

**目標段落**：`## InertiaSharedData 調整`（約第 195-219 行）

**修改內容**：

將 `InertiaSharedData` 定義中的 `messages: Messages` 改為 `messages: Partial<Messages>`：

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

在 `messages` 欄位定義後，緊接新增設計理由說明段落（取代原本的 `> messages 必須為...` blockquote）：

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
```

同步更新 `useTranslation` hook 範例，將參數型別對齊：

```typescript
export function useTranslation() {
  const { messages, locale } = usePage<InertiaSharedData>().props
  const t = useMemo(() => createTranslator(messages), [messages])
  return { t, locale }
}
```

並在 `createTranslator` 簽名處調整為接受 `Partial<Messages>`：

```typescript
export function createTranslator(messages: Partial<Messages>): Translator {
```

**驗證**：確認文件中無殘留 `messages: Messages`（total type）的 DTO 定義。

---

## Task 2 — 新增 Flash / 訊息遷移章節

**目標位置**：在 `## 遷移計畫` 章節**之前**插入新章節 `## Flash 與訊息遷移`。

新增以下完整章節：

```markdown
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
```

**驗證**：確認新章節出現在 `## 遷移計畫` 之前，且包含三個步驟（A / B / C）與遷移優先順序表。

---

## Task 3 — 更新既有遷移計畫（對齊新章節）

**目標段落**：`## 遷移計畫` 的 Phase 1 / Phase 2 / Phase 3。

**修改內容**：

在 Phase 1 新增一個前置步驟，明確說明它依賴 Flash 遷移章節的 Step A：

```markdown
### Phase 0 — Flash Wire Format 遷移（前置）

詳見 [Flash 與訊息遷移](#flash-與訊息遷移) Step A。  
**必須先於 Phase 1 完成**，以確保 `InertiaSharedData.flash` 的結構化格式就位。
```

在 Phase 2 補充 error-code 映射的參照：

```markdown
- 現有 page handler 的 `error: result.message` 透過 `toI18nMessage()` 轉換
  （詳見 [Flash 與訊息遷移](#flash-與訊息遷移) Step B）
```

**驗證**：Phase 0 出現在 Phase 1 之前，Phase 2 有 `toI18nMessage` 參照。

</tasks>

<verification>
完成後確認：

1. `InertiaSharedData.messages` 型別為 `Partial<Messages>`（文件中無 total type DTO 定義）
2. `createTranslator` 接受 `Partial<Messages>`
3. `## Flash 與訊息遷移` 章節存在，包含 Step A / B / C 三段
4. `## 遷移計畫` 包含 Phase 0（flash wire format 前置）
5. 原有章節（型別定義、InertiaSharedData 調整、後端/前端責任邊界、測試策略、檔案清單）完整保留
</verification>

<output>
完成後在 `.planning/quick/260414-mnl-i18n-shared-prop-flash/` 中建立 `260414-mnl-SUMMARY.md`，記錄：
- 修改內容摘要（哪些型別改了、新增哪些章節）
- 文件狀態：已更新，可供實作參照
</output>
```

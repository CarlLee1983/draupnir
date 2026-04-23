# 禁用 Imports 清單

**最後更新**：2026-04-10
**相關項目**：[Bun 依賴優化](./DEPENDENCY_OPTIMIZATION_REPORT.md)
**自動檢查**：`scripts/check-commit.sh`（透過 pre-commit hook / CI 執行）

---

## 目的

本文件列出 Draupnir 專案中**禁止或限制使用**的 NPM 套件與 Node.js 內建模組，並提供對應的 **Bun / Web Crypto 原生替代方案**。

此清單為 Bun 依賴優化項目的成果之一，目的是：

1. **防止已移除依賴回退** — 確保優化後的狀態不被無意中破壞
2. **推廣 Bun 原生 API** — 降低 NPM 依賴數量，提升冷啟動效能
3. **統一替代方案** — 團隊成員使用一致的做法，減少認知負擔

---

## 🚫 完全禁止的 Imports

以下 imports 會在 `pre-commit` 階段被**阻擋**。若新增會導致 commit 失敗。

### 1. `uuid` 套件

```typescript
// ❌ 禁止
import { v4 as uuidv4 } from 'uuid'
const id = uuidv4()
```

**替代方案**：使用全域 `crypto.randomUUID()`（Bun 原生 API，無需 import）

```typescript
// ✅ 推薦
const id = crypto.randomUUID()
```

**理由**：
- Bun/Web Crypto 已內建 `randomUUID()`，無需額外套件
- 移除後減少一個 NPM 依賴

---

### 2. `node:path` 模組

```typescript
// ❌ 禁止
import { resolve, join } from 'node:path'
const fullPath = resolve(process.cwd(), 'public/build/manifest.json')
```

**替代方案**：使用專案提供的 `joinPath()` / `normalizePath()` 工具函式

```typescript
// ✅ 推薦
// 位置：src/Pages/routing/pathUtils.ts
const fullPath = joinPath(process.cwd(), 'public/build/manifest.json')
```

**理由**：
- `joinPath()` 是純字串處理，無需載入 `node:path` 模組
- 簡化跨平台路徑處理（本專案固定使用 POSIX 風格）

---

### 3. `node:crypto` 模組（有條件禁止）

```typescript
// ❌ 禁止（一般情況）
import { createHash, randomBytes } from 'node:crypto'
const hash = createHash('sha256').update(data).digest('hex')
```

**替代方案**：使用 Web Crypto API（`globalThis.crypto`）

```typescript
// ✅ 推薦 — SHA-256 雜湊
const buffer = new TextEncoder().encode(data)
const digest = await crypto.subtle.digest('SHA-256', buffer)
const hash = Array.from(new Uint8Array(digest))
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('')

// ✅ 推薦 — 隨機位元組
const bytes = crypto.getRandomValues(new Uint8Array(16))
```

#### ✅ 白名單（允許使用 `node:crypto`）

| 檔案 | 用途 | 理由 |
|------|------|------|
| `src/Modules/Auth/Infrastructure/Services/PasswordHasher.ts` | 密碼雜湊（scryptSync） | Web Crypto 目前無同步 scrypt，需等待遷移審批 |
| `src/Modules/DevPortal/Domain/ValueObjects/WebhookSecret.ts` | Webhook HMAC 簽章 | 待與 Web Crypto HMAC 對照相容性測試後遷移 |
| `scripts/gen-hash.ts` | 密碼雜湊工具 | 需使用 `scryptSync` 以確保與生產環境一致 |

> 這兩個檔案的遷移列於 `docs/DEPENDENCY_OPTIMIZATION_TODO.md` 的 **Task #5**，需要先取得編輯權限並完成安全性驗證。

**新增白名單的流程**：
1. 提出 PR 說明為何無法使用 Web Crypto API
2. 獲得技術主管核准
3. 編輯 `scripts/check-banned-imports.sh` 中的 `CRYPTO_ALLOWLIST`
4. 更新本文檔的白名單表格

---

## ⚠️ 警告（不阻擋）

### `readFileSync` 新增使用

```typescript
// ⚠️ 警告
import { readFileSync } from 'node:fs'
const content = readFileSync('config.json', 'utf-8')
```

**建議替代方案**：使用 Bun 原生 async API

```typescript
// ✅ 推薦
const content = await Bun.file('config.json').text()
```

**為何只是警告而非阻擋**：
- 應用啟動期間的同步讀取（如 Vite manifest）目前保留
- Bun 的 `Bun.file()` 是 async，遷移會影響呼叫鏈
- 詳見 `docs/DEPENDENCY_OPTIMIZATION_TODO.md` 的 **Task #7**（長期評估）

**何時應該遷移**：
- 不在應用啟動關鍵路徑上
- 檔案可能較大
- 呼叫端已經是 async context

---

## 🔧 自動化檢查機制

### Pre-commit Hook

每次 `git commit` 前會自動執行 `scripts/check-commit.sh`，檢查：

- ✅ 只檢查 **staged 檔案中新增的行**（不會誤報現有程式碼）
- ✅ 只檢查 TypeScript / JavaScript 檔案（`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`）
- ✅ 白名單檔案會被自動略過

同一個 pre-commit hook 也會執行 `bun run check:i18n`，確保：

- ✅ `src/Shared/Infrastructure/I18n/locales/` 的檔案與 `supportedLocales` 一致
- ✅ 每個 locale 都能正常載入 catalog
- ✅ missing key fallback 行為仍然存在

### 手動執行檢查

```bash
# 檢查提交前變更
bun run check:commit

# 檢查 i18n locale 設定
bun run check:i18n
```

### 安裝／重新安裝 Hook

```bash
bun run setup:hooks
# 或
bash scripts/setup-hooks.sh
```

Hook 會安裝到 `.git/hooks/pre-commit`，並包含 `DRAUPNIR_HOOK_MARKER` 標記以便未來更新。

### 繞過 Hook（緊急情況）

```bash
git commit --no-verify -m "..."
```

> ⚠️ **不建議繞過**。若遇到誤報，請優先更新白名單或通報問題。

---

## 📚 相關文件

| 文件 | 用途 |
|------|------|
| `docs/DEPENDENCY_OPTIMIZATION_REPORT.md` | 完整執行報告（Task #1–#3） |
| `docs/DEPENDENCY_OPTIMIZATION_TODO.md` | 待實施任務清單 |
| `scripts/check-commit.sh` | 單一提交檢查入口 |
| `scripts/check-banned-imports.sh` | 檢查腳本實作 |
| `scripts/check-i18n-locales.ts` | i18n locale 契約檢查 |
| `scripts/setup-hooks.sh` | Hook 安裝腳本 |
| `src/Pages/routing/pathUtils.ts` | `joinPath()` / `normalizePath()` 實作位置 |

---

## 🔄 更新本清單

新增或移除禁用項目時，請同步更新以下位置：

1. **本文件** — 新增項目描述與替代方案
2. **`scripts/check-commit.sh`** — 變成提交檢查的單一入口
3. **`scripts/check-banned-imports.sh`** — 新增檢查邏輯
4. **`scripts/check-i18n-locales.ts`** — 新增 locale 契約檢查
5. **`scripts/setup-hooks.sh`** — 將單一提交檢查入口掛入 pre-commit hook
6. **`docs/DEPENDENCY_OPTIMIZATION_TODO.md`** — 在對應 Task 中記錄
7. **Git commit** — 使用 `chore: [deps] 更新禁用 imports 清單` 的格式

---

**維護者**：Draupnir 項目團隊
**問題回報**：發現誤報或遺漏時，請聯繫技術主管或在 repo 內開 issue

# Bun 依賴優化 - 快速參考指南

**版本** 1.1.0  
**日期** 2026-04-26  
**用途** 快速查閱優化詳情、代碼片段與最新進度

---

## 🚀 一句話總結

> Draupnir 成功移除了 `uuid` npm 依賴與 `node:path` 依賴，並將核心加密操作（含密碼雜湊與 Webhook 簽名）轉為 Web Crypto API。自動化防回退機制已落地，全專案 1255/1255 測試通過。

---

## 📋 做了什麼

### UUID 替換
```typescript
// 改用原生 API
const id = crypto.randomUUID()
```

### Hash / HMAC 替換
```typescript
// SHA-256 摘要
const hashBuffer = await crypto.subtle.digest('SHA-256', data)

// HMAC 簽名 (Webhook)
const signature = await crypto.subtle.sign('HMAC', key, data)
```

### 路徑操作替換
```typescript
// 自實現輕量級路徑拼接與正規化 (移除 node:path)
const fullPath = joinPath(root, 'public', 'build')
const safePath = normalizePath(fullPath)
```

---

## 📊 最新統計數據 (v1.1.0)

| 項目 | 數值 |
|------|------|
| 優化模組數 | 10+ 個 |
| npm 依賴減少 | 1 個（uuid） |
| node 內建依賴減少 | 2 個（path, crypto 減量） |
| 防回退機制 | ✅ 已啟動 (Git Hooks & CI) |
| 全專案測試通過數 | 1255 / 1255 |
| 核心任務完成度 | 85%+ |

---

## ✅ 驗證結果

```bash
✅ bun run build    → 1.80 MB (構建成功)
✅ bun run check:commit → 防回退檢查通過
✅ bun run test     → 1255/1255 通過
✅ Git commits      → 5+ 個原子提交
```

---

## 📁 已優化檔案亮點

### 核心服務
- ✅ `PasswordHasher.ts` - 遷移至 `getRandomValues` 與 `async scrypt`
- ✅ `WebhookSecret.ts` - 完整遷移至 Web Crypto HMAC API

### Auth / Organization 模組
- ✅ `Register/Login/Logout/RefreshToken/JwtTokenService.ts`
- ✅ `CreateOrganization/AcceptInvitation/InviteMemberService.ts`

### 基礎設施
- ✅ `page-routes.ts`, `ViteTagHelper.ts`, `AuthMiddleware.ts`
- ✅ `scripts/check-banned-imports.sh` (自動化工具)

---

## 📚 推薦代碼範本

### 1. Web Crypto SHA-256 (Async)
```typescript
async function sha256(str: string): Promise<string> {
  const data = new TextEncoder().encode(str)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(hash).toString('hex')
}
```

### 2. 安全路徑正規化 (取代 node:path)
```typescript
function normalizePath(path: string): string {
  return path.split('/').filter(p => p && p !== '.').reduce((acc, p) => 
    (p === '..' ? acc.slice(0, -1) : [...acc, p]), [] as string[]).join('/')
}
```

---

## 🚫 決策邊界（不做的事）

### 保留 readFileSync
- **原因**：啟動時一次性操作，轉為 async 複雜度過高，目前非瓶頸。

### 暫緩 jose 遷移
- **原因**：`jsonwebtoken` 穩定。已完成文獻評估（見 `JOSE_MIGRATION_EVALUATION.md`），待特定觸發條件（如 CVE）再重啟。

---

## 🎯 下一步行動

### 立即優先 (🔴)
1. 推送遠端 Git 標籤 `bun-optimization-complete`
2. 完善 CHANGELOG.md

### 近期與中期 (🟡/🔵)
3. 啟動 Bun 生態監控計畫 (2026-05-01)
4. 增量維護知識庫
5. 定期複查 jose 遷移可行性

---

## 📖 參考資源

- **文檔索引**：`docs/DEPENDENCY_OPTIMIZATION_INDEX.md`
- **技術報告**：`docs/DEPENDENCY_OPTIMIZATION_REPORT.md`
- **JOSE 評估**：`docs/JOSE_MIGRATION_EVALUATION.md`
- **禁用清單**：`docs/banned-imports.md`

---

**最後更新** 2026-04-26  
**版本** 1.1.0  
**狀態** 核心開發完成，進入維護模式。

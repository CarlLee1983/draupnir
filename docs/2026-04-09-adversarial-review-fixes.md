# Codex Adversarial Review 修正紀錄

**日期**: 2026-04-09
**審查工具**: Codex Adversarial Review（working tree diff）
**審查結論**: needs-attention

---

## 一、安全性與資料完整性修正（Codex 發現）

### 1. Auth Token 缺失時 fail-open

**檔案**: `src/Modules/Auth/Infrastructure/Repositories/AuthTokenRepository.ts`
**嚴重度**: HIGH

**問題**: `isRevoked()` 在 `findByHash()` 回傳 `null` 時回傳 `false`（未撤銷），導致已登出或已清理的 token 仍可通過認證。任何通過 JWT 簽章驗證但在資料庫中無對應記錄的 token 都會被視為有效。

**修正**: 將缺失記錄視為已撤銷（fail-closed），回傳 `true`。

```diff
 if (!record) {
-  // 找不到列時不視為撤銷
-  return false
+  // 找不到記錄視為已撤銷（fail-closed）
+  return true
 }
```

---

### 2. Logout 無法撤銷小寫 `bearer` Token

**檔案**: `src/Modules/Auth/Presentation/Controllers/AuthController.ts`
**嚴重度**: HIGH

**問題**: `AuthMiddleware.extractToken()` 接受 `bearer` 和 `Bearer`（case-insensitive），但 `logout()` 使用 `authHeader.replace('Bearer ', '')` 只處理大寫開頭。當請求使用小寫 `bearer` 時，token 無法正確提取，導致 hash 不匹配、撤銷失敗，但 API 仍回傳成功。

**修正**: 改用與 `AuthMiddleware.extractToken` 相同的 `split + toLowerCase` 邏輯。

```diff
- const token = authHeader.replace('Bearer ', '')
+ const parts = authHeader.split(' ')
+ if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
+   return ctx.json({ ... }, 400)
+ }
+ const token = parts[1]
```

---

### 3. CreditTransaction.fromDatabase() 屬性名錯誤

**檔案**: `src/Modules/Credit/Domain/Entities/CreditTransaction.ts`
**嚴重度**: HIGH

**問題**: `fromDatabase()` 將資料庫欄位 `balance_after` 寫入不存在的建構子屬性 `balance_after`，而非 `balanceAfter`。導致所有從資料庫讀取的交易紀錄 `balanceAfter` 欄位為 `undefined`，帳本讀取路徑完全失效。

**修正**: 將屬性名改為正確的 camelCase。

```diff
- balance_after: row.balance_after as string,
+ balanceAfter: row.balance_after as string,
```

---

### 4. TopUpCreditService 非原子寫入

**檔案**: `src/Modules/Credit/Application/Services/TopUpCreditService.ts`
**嚴重度**: HIGH

**問題**: 餘額更新（`accountRepo.update`）與帳本記錄（`txRepo.save`）分開執行，無 DB transaction 包裹。若第二步失敗，餘額已變但無審計記錄，重試可能雙重加值。

**修正**: 注入 `IDatabaseAccess`，使用 `db.transaction()` 搭配 `withTransaction()` 將兩步寫入包裹在同一交易中。

```diff
+ await this.db.transaction(async (tx) => {
+   const txAccountRepo = this.accountRepo.withTransaction(tx)
+   const txTxRepo = this.txRepo.withTransaction(tx)
+   await txAccountRepo.update(updated)
+   await txTxRepo.save(transaction)
+ })
```

---

### 5. CreditDeductionService 非原子寫入

**檔案**: `src/Modules/Credit/Domain/Services/CreditDeductionService.ts`
**嚴重度**: HIGH

**問題**: 與 TopUpCreditService 相同——扣款路徑的餘額更新與交易記錄未在同一 DB transaction 中執行。

**修正**: `DeductParams` 新增 `db: IDatabaseAccess`，同樣使用 `db.transaction()` 包裹。

---

## 二、TypeScript 編譯錯誤修正（Zod v4 遷移）

專案升級至 Zod v4 後，多處程式碼仍使用 Zod v3 API，導致型別檢查失敗。

### 6. `.errors` 改為 `.issues`

**影響檔案**:
- `src/Modules/Auth/Presentation/Controllers/AuthController.ts`（2 處）
- `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts`（5 處）
- `src/Modules/User/Presentation/Controllers/UserController.ts`（2 處）

**問題**: Zod v4 將 `ZodError.errors` 重新命名為 `ZodError.issues`。

```diff
- validation.error.errors[0].message
+ validation.error.issues[0].message
```

---

### 7. `z.enum` 的 `errorMap` 參數不再支援

**影響檔案**:
- `src/Modules/Organization/Presentation/Validators/organization.validator.ts`
- `src/Modules/User/Presentation/Validators/changeStatus.validator.ts`

**問題**: Zod v4 的 `z.enum()` 不再接受 `errorMap`，改用 `error` 字串。

```diff
- z.enum(['active', 'suspended'], {
-   errorMap: () => ({ message: '無效的狀態值' })
- })
+ z.enum(['active', 'suspended'], {
+   error: '無效的狀態值'
+ })
```

---

### 8. `z.record` 需要兩個參數

**檔案**: `src/Modules/User/Presentation/Validators/updateProfile.validator.ts`

**問題**: Zod v4 的 `z.record()` 需要明確指定 key schema 與 value schema（兩個參數）。

```diff
- notificationPreferences: z.record(z.any()).optional(),
+ notificationPreferences: z.record(z.string(), z.any()).optional(),
```

---

### 9. `toDTO()` 回傳 `Record<string, unknown>` 導致型別不安全

**檔案**: `src/Modules/ApiKey/Application/Services/CreateApiKeyService.ts`

**問題**: `ApiKey.toDTO()` 回傳 `Record<string, unknown>`，取出的 `bifrostVirtualKeyId` 型別為 `unknown`，無法傳入 `deleteVirtualKey(string)`。

**修正**: 加上型別斷言 `as string | undefined`。

---

### 10. KeyScope.fromJSON 測試使用錯誤欄位名

**檔案**: `src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts`

**問題**: 測試傳入 `{ rpm, tpm, models }` 但 `KeyScopeJSON` 介面定義為 `{ rate_limit_rpm, rate_limit_tpm, allowed_models }`。

```diff
- KeyScope.fromJSON({ rpm: 60, tpm: 100000, models: ['*'] })
+ KeyScope.fromJSON({ rate_limit_rpm: 60, rate_limit_tpm: 100000, allowed_models: ['*'] })
```

---

## 驗證結果

- `npx tsc --noEmit`: 零錯誤通過
- `npx vitest run`: 所有可解析模組的測試通過（部分測試因 `@/` 路徑別名未在 vitest 中配置而無法載入，屬既有問題）

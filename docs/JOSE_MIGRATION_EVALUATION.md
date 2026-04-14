# Jose 遷移評估報告

**文檔類型**：技術決策文檔（ADR 風格）
**評估日期**：2026-04-10
**最後同步程式庫**：2026-04-13（路徑、port、呼叫端、測試與工具數字與 repo 對齊）
**評估者**：Claude Code
**關聯任務**：[DEPENDENCY_OPTIMIZATION_TODO.md](./DEPENDENCY_OPTIMIZATION_TODO.md) Task #6
**狀態**：✅ 評估完成 — **決策：暫不遷移**
**下次重評時機**：2026-06-30（Q2 中期評估）或觸發條件達成時

---

## 📋 執行摘要

### 決策

> **暫不將 `jsonwebtoken` 遷移至 `jose`。保留現狀至觸發條件達成。**

### 核心理由

| 維度 | 現狀評估 |
|------|---------|
| **技術可行性** | ✅ 可行，jose 完全支援 Bun、API 相容 |
| **商業迫切性** | ❌ 無 — jsonwebtoken 穩定、無安全 CVE、效能足夠 |
| **投入產出比** | ⚠️ 低 — 約 12+ 檔案改動（含 `IJwtTokenService` port）換來「少 2 個套件」 |
| **風險** | 🟡 中低 — API 變為 async，需完整測試覆蓋 |

### 觸發重新評估的條件（任一達成即重啟）

1. 🔐 `jsonwebtoken` 出現安全漏洞（CVE）或停止維護
2. 🔑 專案需要支援 **RS256/ES256**（非對稱簽章、JWKS）
3. 🌐 專案需要支援 **OpenID Connect** 或 **JWE 加密**
4. ⚡ 在 benchmark 中確認 JWT 操作成為效能瓶頸（目前非瓶頸）
5. 📦 進行 dependency audit 時，決定全面清理 devDependencies

---

## 🎯 背景與動機

### 為什麼要評估？

本評估源自 Bun 依賴優化項目（詳見 [DEPENDENCY_OPTIMIZATION_REPORT.md](./DEPENDENCY_OPTIMIZATION_REPORT.md)）。在 Task #1–#3 完成 `uuid`、`node:path`、`node:crypto` 的遷移後，`jsonwebtoken` 是剩下少數仍可考慮替換的純 NPM 依賴。

### 歷史脈絡

Task #3「後續評估」階段已經初步判斷 jsonwebtoken 遷移「暫不執行」，本評估是將該結論**正式文檔化**，並為未來重啟提供完整的分析基礎。

---

## 🔍 現狀分析

### 架構位置

```
src/Modules/Auth/
├── Application/
│   ├── Ports/
│   │   └── IJwtTokenService.ts         ← JWT port（Application 依賴介面）
│   └── Services/
│       ├── LoginUserService.ts         ← 經 port 使用 JWT
│       ├── RefreshTokenService.ts
│       └── GoogleOAuthService.ts
├── Infrastructure/
│   └── Services/
│       └── JwtTokenService.ts          ← 唯一 `import 'jsonwebtoken'`（約 117 行）
└── Domain/
    └── ValueObjects/
        └── AuthToken.ts                 ← 值物件（不依賴 jsonwebtoken）
```

> ✅ **封裝度極佳**：`jsonwebtoken` 僅在 `Infrastructure/Services/JwtTokenService.ts` 被 import；Application 層只認 `IJwtTokenService`，符合 hexagonal / DDD 依賴方向。

### 實際使用的 API 面

整個專案只用了 **3 個 jsonwebtoken API**，且全部是同步：

| API | 位置 | 功能 |
|-----|------|------|
| `jwt.sign(payload, secret)` | `Infrastructure/Services/JwtTokenService.ts`:40, 58 | 簽發 token（預設 HS256） |
| `jwt.verify(token, secret)` | 同上:66–68 | 驗證簽章 + 過期時間 |
| `jwt.decode(token)` | 同上:81 | 解析但不驗證 |

**注意事項：**
- 簽章演算法：**HS256**（對稱 HMAC SHA-256，jsonwebtoken 預設）
- 密鑰：單一環境變數字串 `process.env.JWT_SECRET`
- `iat` / `exp` / `jti` **手動塞進 payload**，未使用 `expiresIn` option
- `jti` 已使用 `crypto.randomUUID()`（Bun 原生，非 npm uuid）

### Public API（`IJwtTokenService` / `JwtTokenService`）

Application 與其他模組依賴 **`IJwtTokenService`**（`Application/Ports/IJwtTokenService.ts`）；`JwtTokenService` 為 Infrastructure 實作。

```typescript
interface IJwtTokenService {
  signAccessToken(payload: TokenSignPayload): AuthToken
  signRefreshToken(payload: TokenSignPayload): AuthToken
  verify(token: string): TokenPayload | null
  decode(token: string): TokenPayload | null
  isValid(token: string): boolean
  getTimeToExpire(token: string): number
  isAboutToExpire(token: string): boolean
}
```

### 呼叫端清單

| 檔案 | 使用的方法 | 所在模組 |
|------|----------|---------|
| `src/Shared/Infrastructure/Middleware/AuthMiddleware.ts` | `verify`（直接 `new JwtTokenService()`） | Shared |
| `src/Modules/Auth/Application/Services/LoginUserService.ts` | `signAccessToken`, `signRefreshToken` | Auth |
| `src/Modules/Auth/Application/Services/RefreshTokenService.ts` | `verify`, `signAccessToken` | Auth |
| `src/Modules/Auth/Application/Services/GoogleOAuthService.ts` | `signAccessToken`（於私有 `issueSuccess`） | Auth |
| `src/Modules/CliApi/Application/Services/ExchangeDeviceCodeService.ts` | `signAccessToken`, `signRefreshToken` | CliApi |
| `src/Modules/Auth/__tests__/LoginUserService.test.ts` | `verify` | 測試 |
| `src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts` | `verify` + dynamic `jsonwebtoken` | 測試 |
| `src/Modules/Auth/__tests__/GoogleOAuthService.test.ts` | mock `IJwtTokenService` | 測試 |
| `src/Modules/CliApi/__tests__/ExchangeDeviceCodeService.test.ts` | `new JwtTokenService()` | 測試 |
| `src/Modules/CliApi/__tests__/CliApiController.test.ts` | 透過 `ExchangeDeviceCodeService` 間接使用 JWT | 測試 |

> **好消息**：多數 production service 方法已是 `async`（登入、refresh、裝置碼交換等），把 `sign*` / `verify` 改成 `Promise` 後主要在方法內補 `await` 即可。需特別處理 **`GoogleOAuthService.issueSuccess`**：目前為同步私有方法，遷移時應改為 `async` 並在 `exchange` 內 `await`。**`AuthMiddleware`** 仍須將驗證路徑改為 `await`（middleware handler 本身可維持 async）。

---

## 📦 Jose 庫簡介

### 基本資訊

| 項目 | 內容 |
|------|------|
| **名稱** | `jose` |
| **維護者** | [panva](https://github.com/panva)（Filip Skokan, Okta 員工）|
| **GitHub** | https://github.com/panva/jose |
| **許可證** | MIT |
| **Runtime** | Web Crypto API（瀏覽器、Node.js、Deno、**Bun**、Cloudflare Workers）|
| **Tree-shakeable** | ✅ 是 |
| **TypeScript** | ✅ 內建 types（不需要 `@types/jose`）|
| **發布頻率** | 高（相較於 jsonwebtoken 的低頻率）|

### 設計哲學差異

| 面向 | `jsonwebtoken` | `jose` |
|------|----------------|--------|
| API 風格 | 函式式、callback-friendly | Builder pattern + Promise |
| 同步/非同步 | 同步為主 | **Async only**（除 `decodeJwt`）|
| 密鑰格式 | 字串或 Buffer | `Uint8Array` 或 CryptoKey |
| 演算法支援 | HS*/RS*/ES*/PS*/none | HS*/RS*/ES*/PS*/**EdDSA** |
| JWE 加密 | ❌ | ✅ |
| JWKS | 需要 `jwks-rsa` 套件 | ✅ 內建 |
| OpenID Connect | ❌ | ✅ 內建支援 |
| 對 Web Crypto | ❌（自己實作 HMAC）| ✅（原生使用）|

### Bun 相容性

`jose` 明確在其 [README 相容性表](https://github.com/panva/jose#runtime-support-matrix)中列出 Bun 為一級支援 runtime。不存在已知的 Bun 特定問題。

---

## 🔄 API 對照表

### 1. 簽發 Token

```typescript
// ❌ jsonwebtoken（同步）
import jwt from 'jsonwebtoken'

const token = jwt.sign(payload, JWT_SECRET)
// 返回: string
```

```typescript
// ✅ jose（async）
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(JWT_SECRET)  // 建構時一次性轉換

const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .sign(secret)
// 返回: Promise<string>
```

**變化**：
- 必須明確指定 `alg`（jose 不預設 HS256，避免混淆風險）
- Secret 需要是 `Uint8Array`（建議在建構子中一次性轉換並快取）
- 整個操作變為 `async`

### 2. 驗證 Token

```typescript
// ❌ jsonwebtoken（同步）
try {
  const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
  return payload
} catch {
  return null
}
```

```typescript
// ✅ jose（async）
import { jwtVerify } from 'jose'

try {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],  // 明確白名單，拒絕其他演算法
  })
  return payload as TokenPayload
} catch {
  return null
}
```

**變化**：
- `jwtVerify` 返回 `{ payload, protectedHeader }` 結構
- `algorithms` 選項是**安全性強化**：避免 `alg=none` 或降級攻擊
- 自動驗證 `exp`、`nbf` 等標準 claims

### 3. 解析不驗證

```typescript
// ❌ jsonwebtoken
const payload = jwt.decode(token) as TokenPayload
```

```typescript
// ✅ jose（保持同步！）
import { decodeJwt } from 'jose'

const payload = decodeJwt(token) as TokenPayload
```

> 💡 **關鍵點**：`decodeJwt()` 是 jose 中**唯一的同步 API**，因為解析 JSON 不涉及密碼學操作。這代表 `JwtTokenService.decode()`、`getTimeToExpire()`、`isAboutToExpire()` 可以**保持同步**。

---

## 🎯 遷移影響範圍

### 受影響檔案（約 12+ 個）

| # | 檔案 | 改動類型 | 估計行數 |
|---|------|---------|---------|
| 1 | `Application/Ports/IJwtTokenService.ts` | 將 `sign*` / `verify` / `isValid` 改為 `Promise` 簽章 | ~10 行 |
| 2 | `Infrastructure/Services/JwtTokenService.ts` | 全面改寫（`jose` + `implements IJwtTokenService`） | ~40 行 |
| 3 | `AuthToken.ts`（Domain） | **無需修改** | 0 |
| 4 | `AuthMiddleware.ts` | 加 `await` | ~2 行 |
| 5 | `LoginUserService.ts` | 加 `await` x2 | ~2 行 |
| 6 | `RefreshTokenService.ts` | 加 `await` x2 | ~2 行 |
| 7 | `GoogleOAuthService.ts` | `issueSuccess` 改 `async`，`signAccessToken` 加 `await`；`exchange` 內 `return await` | ~5 行 |
| 8 | `ExchangeDeviceCodeService.ts` | 加 `await` x2 | ~2 行 |
| 9 | `AuthServiceProvider.ts` | **通常無需修改**（仍綁定 `JwtTokenService` 實例） | 0 |
| 10 | `LoginUserService.test.ts` | 加 `await` | ~1 行 |
| 11 | `AuthFlow.e2e.test.ts` | 改 dynamic import + `await` | ~3 行 |
| 12 | `ExchangeDeviceCodeService.test.ts` / `CliApiController.test.ts` | 視型別推斷與 async 鏈，多為補 `await` 或維持不變 | ~0–2 行 |
| 13 | `GoogleOAuthService.test.ts` | mock 方法改 `mockResolvedValue` 等（若斷言 await JWT） | 視測試而定 |

### 依賴變動

```diff
// package.json
{
  "dependencies": {
-   "jsonwebtoken": "^9.0.0",
+   "jose": "^6.x"
  },
  "devDependencies": {
-   "@types/jsonwebtoken": "^9.0.7"
  }
}
```

**淨效益**：`-1 dependency, -1 devDependency` = **減少 2 個 npm 套件**

### Breaking Changes（內部 API）

這些是 **`IJwtTokenService`（及實作類）** 的破壞性變更；所有透過 port 注入的 Application service 都會被型別強制更新。

```typescript
// Before
signAccessToken(payload): AuthToken
signRefreshToken(payload): AuthToken
verify(token): TokenPayload | null
isValid(token): boolean

// After (breaking)
async signAccessToken(payload): Promise<AuthToken>
async signRefreshToken(payload): Promise<AuthToken>
async verify(token): Promise<TokenPayload | null>
async isValid(token): Promise<boolean>

// 保持不變（decodeJwt 是同步）
decode(token): TokenPayload | null
getTimeToExpire(token): number
isAboutToExpire(token): boolean
```

> ✅ **外部 API 穩定性**：雖然 service / port 層有 breaking change，但**HTTP API 的 request/response 完全不變**。用戶端感知不到任何差異。

---

## 🛡️ 相容性分析

### Token 格式相容性（零停機關鍵）

| 項目 | jsonwebtoken HS256 | jose HS256 | 相容? |
|------|-------------------|-----------|------|
| Header | `{"alg":"HS256","typ":"JWT"}` | `{"alg":"HS256"}` | ✅ (typ 可選) |
| Payload | 自定義 + iat/exp/jti | 自定義 + iat/exp/jti | ✅ |
| Signature 演算法 | HMAC-SHA256 | HMAC-SHA256 | ✅ |
| 密鑰 | UTF-8 字串 bytes | UTF-8 bytes (TextEncoder) | ✅ 相同 |

**結論**：兩個庫產出的 token **互相驗證**沒有問題。這是關鍵前提，代表可以**零停機遷移**：

```
部署 T0:  user 拿到 jsonwebtoken 簽的 token（15 分鐘有效）
部署 T1:  升級至 jose
結果:    舊 token 仍可用 jose.jwtVerify 驗證到 T0+15min
         新 token 由 jose 簽發，格式完全相同
```

### Runtime 相容性

| 執行環境 | 相容性 |
|---------|--------|
| **Bun 1.x** | ✅ 原生支援，官方列為 tier-1 |
| **測試環境（bun test）** | ✅ 同 Bun runtime |
| **Production（bun run）** | ✅ 同上 |
| **Vite 前端**（若有 SSR）| ✅ jose 支援 browser 環境 |

---

## 💰 成本效益分析

### 成本

| 項目 | 量化估計 |
|------|---------|
| **實作時間** | 2–4 小時（port + Infrastructure + Google OAuth 鏈 + 測試）|
| **Code Review** | 1 輪（因為是安全相關代碼）|
| **測試執行** | `bun run test` 全量通過；Auth 相關單路徑約 60+ 例（2026-04-13：`bun test src/Modules/Auth` 報告 67 pass / 1 skip） |
| **風險緩解** | 需在 staging 環境驗證跨版本 token 相容 |
| **文檔更新** | 需更新 AGENTS.md 和 API 文檔 |

### 效益

| 項目 | 實際值 |
|------|--------|
| **減少 NPM 依賴** | -2（jsonwebtoken + @types/jsonwebtoken）|
| **Bundle size 影響** | **可忽略**（專案是 Bun server，非 browser bundle）|
| **啟動時間影響** | **可忽略**（< 5ms，無法量測）|
| **JWT 操作效能** | **無差異**（兩者都用相同的 HMAC 實作）|
| **未來功能解鎖** | RS256/JWKS/JWE/OIDC 支援（目前不需要）|
| **安全性改善** | 輕微（jose `algorithms` 白名單避免降級攻擊）|

### 機會成本（Opportunity Cost）

同樣 2-3 小時可以用於：

1. ✅ 清理 **Biome lint 警告 backlog**（2026-04-13 約 630+ 則 warnings，實際數字以 `bun run lint` 為準）
2. ✅ 執行 **Task #5**（PasswordHasher/WebhookSecret 遷移，完成 node:crypto 清理）
3. ✅ 開發新功能 / 修 bug / 補測試

---

## ⚠️ 風險評估

### 技術風險

| 風險 | 機率 | 影響 | 緩解 |
|------|------|------|------|
| Bun + jose 相容性問題 | 極低 | 高 | 官方支援，社群無回報問題 |
| async 化造成其他呼叫鏈漏掉 await | 低 | 中 | TypeScript 會抓到 `Promise<AuthToken>` 誤用 |
| Token 跨版本驗證失敗 | 極低 | 高 | RFC 7519 標準，兩庫產出格式相同 |
| 測試 mock 需要調整 | 中 | 低 | 主要是加 `.mockResolvedValue` |

### 安全風險

| 風險 | 評估 |
|------|------|
| 降級攻擊（alg=none）| ✅ jose 更安全 — 強制 `algorithms` 白名單 |
| 密鑰洩漏 | 無差異 — 都從環境變數讀取 |
| 時序攻擊（timing attack）| 無差異 — 兩者都用 constant-time 比較 |

### 回滾策略

若遷移後發現問題，回滾路徑清晰：

1. **快速回滾**：`git revert` 單一 PR
2. **Token 相容性**：jose 簽發的 token 仍可被 jsonwebtoken 驗證，所以**不需要失效現有 session**
3. **測試保險**：`bun run test` 與 Auth 路徑測試會先於 production 抓到問題

---

## 📐 對照原始決策標準

來自 [DEPENDENCY_OPTIMIZATION_TODO.md](./DEPENDENCY_OPTIMIZATION_TODO.md) Task #6 的標準：

| 標準 | 要求 | 實際評估 | 結論 |
|------|------|---------|------|
| 性能提升 > 10% 或無下降 | ✅ 必須 | 無明顯差異 | ✅ 通過 |
| 代碼複雜度不增加 | ✅ 必須 | **略微增加**（async 化）| ⚠️ 勉強 |
| Bun 完全相容 | ✅ 必須 | 完全相容 | ✅ 通過 |
| 所有測試通過 | ✅ 必須 | 需執行後確認 | ⏳ 待驗證 |

> **關鍵發現**：「代碼複雜度」這個標準是**勉強通過**的 — async 化會讓 `AuthMiddleware` 等原本同步的驗證邏輯變成 async。雖然 consumer 本來就是 async，但呼叫鏈的顯式程度會降低（每個 `verify` 都需要 `await`）。

---

## 🏁 最終決策

### ❌ 暫不遷移

**綜合考量**：
1. **無商業迫切性** — jsonwebtoken 穩定運作、無安全 CVE
2. **效益邊際遞減** — 減少 2 個依賴不帶來可感知的使用者價值
3. **機會成本較高** — 同樣時間用於 Biome warnings 清理或 Task #5 更有價值
4. **複雜度微增** — async 化雖然不嚴重，但讓代碼略複雜

### ✅ 何時應該重啟評估

達成以下任一條件時，應該重新開啟本評估：

1. **🔐 安全觸發**
   - `jsonwebtoken` 出現 CVE（CVSS ≥ 7.0）
   - `auth0/node-jsonwebtoken` 連續 12 個月無更新

2. **🔑 功能觸發**
   - 需要支援 **RS256/ES256**（例如第三方身份提供者）
   - 需要 **JWKS** 支援（public key rotation）
   - 需要 **OpenID Connect** 完整流程
   - 需要 **JWE**（加密 JWT）

3. **⚡ 性能觸發**
   - JWT 操作在 benchmark 中確認為瓶頸
   - 每秒 sign/verify 需求 > 10k（目前非瓶頸）

4. **📦 策略觸發**
   - 進行專案全面 dependency audit
   - 決定將 JWT 相關邏輯獨立為 micro-service

---

## 📖 未來執行 Playbook

> 當決定重啟遷移時，依照以下步驟執行。本節為**未來自己的指南**。

### 前置準備

- [ ] 確認重啟觸發條件（記錄於 PR 描述）
- [ ] 建立分支：`git checkout -b refactor/auth-jose-migration`
- [ ] 執行 baseline：`bun run test > /tmp/before.txt`（或至少 `bun test src/Modules/Auth src/Shared/Infrastructure/Middleware`）
- [ ] 安裝 jose：`bun add jose && bun remove jsonwebtoken @types/jsonwebtoken`

### 實作步驟（按順序）

#### Step 0: 更新 `IJwtTokenService.ts`

將 `signAccessToken`、`signRefreshToken`、`verify`、`isValid` 改為回傳 `Promise<...>`，與下述實作一致。

#### Step 1: 改寫 `Infrastructure/Services/JwtTokenService.ts`

```typescript
import { SignJWT, jwtVerify, decodeJwt } from 'jose'
import type { IJwtTokenService, TokenSignPayload } from '../../Application/Ports/IJwtTokenService'
import { AuthToken, TokenType, type TokenPayload } from '../../Domain/ValueObjects/AuthToken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const ACCESS_TOKEN_EXPIRES_IN = 15 * 60
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60

export class JwtTokenService implements IJwtTokenService {
  private readonly secret: Uint8Array

  constructor() {
    this.secret = new TextEncoder().encode(JWT_SECRET)
  }

  async signAccessToken(payload: TokenSignPayload): Promise<AuthToken> {
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000)
    const tokenPayload: TokenPayload = {
      ...payload,
      jti: crypto.randomUUID(),
      type: TokenType.ACCESS,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    }

    const token = await new SignJWT({ ...tokenPayload })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(this.secret)

    return new AuthToken(token, expiresAt, TokenType.ACCESS, tokenPayload)
  }

  async signRefreshToken(payload: TokenSignPayload): Promise<AuthToken> {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000)
    const tokenPayload: TokenPayload = {
      ...payload,
      jti: crypto.randomUUID(),
      type: TokenType.REFRESH,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    }

    const token = await new SignJWT({ ...tokenPayload })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(this.secret)

    return new AuthToken(token, expiresAt, TokenType.REFRESH, tokenPayload)
  }

  async verify(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
      })
      return payload as unknown as TokenPayload
    } catch {
      return null
    }
  }

  decode(token: string): TokenPayload | null {
    try {
      return decodeJwt(token) as unknown as TokenPayload
    } catch {
      return null
    }
  }

  async isValid(token: string): Promise<boolean> {
    const payload = await this.verify(token)
    if (!payload) return false
    return payload.exp > Math.floor(Date.now() / 1000)
  }

  getTimeToExpire(token: string): number {
    const payload = this.decode(token)
    if (!payload) return -1
    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, (payload.exp - now) * 1000)
  }

  isAboutToExpire(token: string): boolean {
    return this.getTimeToExpire(token) < 60 * 1000
  }
}
```

#### Step 2: 執行 `bun run typecheck`

TypeScript 會顯示所有漏掉的 `await` 為 type error。修復每一個。

#### Step 3: 逐檔加 `await`

- [ ] `AuthMiddleware.ts`（確認 handler 為 async，`verify` 加 `await`）
- [ ] `LoginUserService.ts`（`signAccessToken` / `signRefreshToken` 呼叫處）
- [ ] `RefreshTokenService.ts`（`verify`、`signAccessToken`）
- [ ] `GoogleOAuthService.ts`（`issueSuccess` → `async`，`exchange` 內 `await issueSuccess(...)`）
- [ ] `ExchangeDeviceCodeService.ts`（兩處 `sign*`）

#### Step 4: 修測試

- [ ] `LoginUserService.test.ts`：`await jwtTokenService.verify(...)` 等
- [ ] `AuthFlow.e2e.test.ts`：`verify` 與 dynamic import 路徑加 `await`；過期 token 可改用 `SignJWT`
- [ ] `ExchangeDeviceCodeService.test.ts`、`CliApiController.test.ts`：依編譯錯誤補 `await`
- [ ] `GoogleOAuthService.test.ts`：mock `IJwtTokenService` 的 async 方法

#### Step 5: 驗證

- [ ] `bun run typecheck` 通過
- [ ] `bun run lint` 通過（0 errors）
- [ ] `bun run test` 全量通過
- [ ] `bun run build` 成功
- [ ] 手動測試登入/登出/refresh 流程

#### Step 6: 相容性驗證（staging）

- [ ] 部署 jose 版本至 staging
- [ ] 確認舊 jsonwebtoken 簽的 token 可被 jose 驗證
- [ ] 確認新 jose 簽的 token 可被**舊程式**（若有）驗證
- [ ] 等 15 分鐘（access token 生命週期）確認無異常

#### Step 7: 更新文檔

- [ ] 更新 `DEPENDENCY_OPTIMIZATION_REPORT.md` 新增一節
- [ ] 更新 `DEPENDENCY_OPTIMIZATION_TODO.md` 標記 Task #6 完成
- [ ] 本文檔狀態改為「已執行」並記錄執行日期
- [ ] 更新 `docs/banned-imports.md` 加入 `jsonwebtoken` 為禁用項目
- [ ] 更新 `scripts/check-banned-imports.sh` 加入 `jsonwebtoken` 檢查

#### Step 8: 發布

- [ ] 建立 PR，標題：`refactor: [auth] 遷移 jsonwebtoken 至 jose`
- [ ] PR 描述連結到本文檔
- [ ] Code review（建議找第二位工程師）
- [ ] 合併後建立新 tag：`jose-migration-complete`

### 回滾流程

若 staging 驗證失敗或生產發現問題：

```bash
git revert <merge-commit-sha>
bun install
bun run build
# 部署
```

**關鍵前提**：因為 token format 完全相容，**不需要失效 session**，也**不需要用戶重新登入**。

---

## 📚 相關資源

### 專案內文檔
- [DEPENDENCY_OPTIMIZATION_REPORT.md](./DEPENDENCY_OPTIMIZATION_REPORT.md) — Bun 依賴優化執行報告
- [DEPENDENCY_OPTIMIZATION_TODO.md](./DEPENDENCY_OPTIMIZATION_TODO.md) — 後續任務清單（本評估對應 Task #6）
- [banned-imports.md](./banned-imports.md) — 禁用 imports 清單（遷移後 jsonwebtoken 會加入）

### 外部資源
- [jose GitHub](https://github.com/panva/jose)
- [jose 文檔](https://github.com/panva/jose/blob/main/docs/README.md)
- [jose Runtime Support Matrix](https://github.com/panva/jose#runtime-support-matrix)
- [RFC 7519 - JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [jsonwebtoken GitHub](https://github.com/auth0/node-jsonwebtoken)

### 程式碼參考
- `src/Modules/Auth/Infrastructure/Services/JwtTokenService.ts` — 現有實作（`jsonwebtoken`）
- `src/Modules/Auth/Application/Ports/IJwtTokenService.ts` — JWT port
- `src/Modules/Auth/Domain/ValueObjects/AuthToken.ts` — Token 值物件

---

## 🔄 文檔維護

| 事件 | 動作 |
|------|------|
| 重啟評估時 | 更新「狀態」欄位，新增「重啟原因」章節 |
| 執行遷移後 | 狀態改為「已執行」，記錄實際執行日期與 PR 連結 |
| 決策改變 | 建立新版本，保留舊版本作為歷史紀錄 |
| 2026-06-30（Q2 中期）| 重讀觸發條件，確認是否仍維持暫不遷移決策 |
| 2026-04-13 | 同步架構：`JwtTokenService` 移至 Infrastructure、新增 `IJwtTokenService` 與 `GoogleOAuthService` 呼叫鏈 |

---

**維護者**：Draupnir 項目團隊
**下次檢視**：2026-06-30（或觸發條件達成時）

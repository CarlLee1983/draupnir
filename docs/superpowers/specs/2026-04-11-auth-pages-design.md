# Auth 模組使用者頁面設計（第一週期）

**日期**：2026-04-11  
**版本**：1.0  
**範圍**：Auth 模組 5 個 Inertia 頁面 + Google OAuth 整合  

---

## 目標與概述

### 目標
完成 Draupnir 的**基礎認證使用者界面**，支持：
- Email + 密碼登入/註冊
- 密碼重置流程
- 郵箱驗證（可選）
- Google OAuth 社交登入
- 登入狀態管理（記住我功能）

### 成功指標
1. 所有 5 個頁面路由正常運作（GET/POST）
2. 認證流程端對端測試通過（登入 → 認證 → 存取受保護資源）
3. OAuth 流程能正常處理 Google 重導
4. 單元測試覆蓋 ≥ 80%
5. E2E 測試驗證核心使用者旅程

---

## 頁面清單與功能

### 1. LoginPage

**路由**：`GET /login`, `POST /login`  
**責任**：使用者登入表單與社交登入入口

**GET 流程**：
1. 檢查使用者是否已登入 → 如是，重導至 Dashboard
2. 返回 Inertia 頁面，包含：
   - CSRF token
   - Google OAuth authorize URL（由後端 GET /oauth/google/authorize 生成，前端點擊按鈕重導至此端點）
   - 上次登入的郵箱（可選，從 cookie 讀取）

**POST 流程**：
1. 驗證輸入（Email 格式、密碼非空）
2. 調用 `LoginUserService.execute(email, password)`
3. 失敗 → 返回表單 + 錯誤訊息（「無效的郵箱或密碼」、「帳號已暫停」）
4. 成功 → 發行 JWT + refresh token，重導至 `/member/dashboard`
5. 若勾選「記住我」→ 設定更長的 refresh token 有效期

**表單欄位**：
- Email（必填，email 格式）
- 密碼（必填，≥ 8 字元）
- ☑ 記住我（可選）
- 按鈕：登入、Google 登入
- 連結：忘記密碼、還沒有帳號？

**Inertia Props**：
```typescript
{
  csrfToken: string
  googleOAuthUrl: string
  lastEmail?: string
  error?: string
}
```

---

### 2. RegisterPage

**路由**：`GET /register`, `POST /register`  
**責任**：使用者註冊表單

**GET 流程**：
1. 返回註冊表單 + CSRF token
2. 顯示密碼強度提示

**POST 流程**：
1. 驗證輸入：
   - Email 格式正確
   - Email 未被佔用（查詢 AuthRepository）
   - 密碼 ≥ 8 字元，包含大小寫 + 數字 + 特殊符號
   - 確認密碼與密碼相符
   - 已同意條款（checkbox）
2. 調用 `RegisterUserService.execute(email, password)`
3. 失敗 → 返回表單 + 錯誤訊息
4. 成功 → 
   - 若需郵箱驗證：
     - 發送驗證郵件
     - 返回「檢查你的郵箱」訊息
   - 若不需郵箱驗證：
     - 直接登入（發行 JWT）
     - 重導至 Dashboard 或歡迎頁面

**表單欄位**：
- Email（必填）
- 密碼（必填，顯示強度條）
- 確認密碼（必填）
- ☑ 我已閱讀並同意服務條款（必填）
- 按鈕：建立帳號
- 連結：已有帳號？登入

**Inertia Props**：
```typescript
{
  csrfToken: string
  passwordRequirements: {
    minLength: number
    requiresUppercase: boolean
    requiresLowercase: boolean
    requiresNumbers: boolean
    requiresSpecialChars: boolean
  }
}
```

---

### 3. ForgotPasswordPage

**路由**：`GET /forgot-password`, `POST /forgot-password`  
**責任**：密碼重置請求

**GET 流程**：
1. 返回簡單表單（僅 Email + CSRF token）

**POST 流程**：
1. 驗證 Email 格式
2. 查詢使用者：
   - 未找到 → 返回「如果此郵箱已註冊，將收到重設連結」（安全訊息，不洩露使用者存在狀態）
   - 找到 → 生成重設令牌（JWT 或隨機令牌，有效期 1 小時）
3. 發送郵件：包含 `/reset-password/:token` 連結
4. 返回「重設連結已發送至你的郵箱」訊息

**表單欄位**：
- Email（必填）
- 按鈕：發送重設連結
- 連結：回到登入

**Inertia Props**：
```typescript
{
  csrfToken: string
  submitted?: boolean
}
```

---

### 4. ResetPasswordPage

**路由**：`GET /reset-password/:token`, `POST /reset-password/:token`  
**責任**：密碼重設確認

**GET 流程**：
1. 驗證令牌：
   - 令牌格式正確
   - 令牌未過期
   - 令牌對應存在的使用者
2. 失敗 → 返回「連結已過期或無效，請重新申請」
3. 成功 → 返回重設密碼表單

**POST 流程**：
1. 重新驗證令牌
2. 驗證新密碼（同註冊頁面規則）
3. 查詢對應使用者
4. 更新密碼（調用 `ChangePasswordService` 或直接呼叫 AuthRepository）
5. 失敗 → 返回錯誤
6. 成功 → 返回「密碼已重設」訊息，提供登入連結

**表單欄位**：
- 新密碼（必填，顯示強度條）
- 確認密碼（必填）
- 按鈕：重設密碼

**Inertia Props**：
```typescript
{
  csrfToken: string
  token: string
  tokenValid: boolean
  error?: string
}
```

---

### 5. EmailVerificationPage

**路由**：`GET /verify-email/:token`  
**責任**：郵箱驗證確認（一般為自動重導，無 POST）

**流程**：
1. 驗證令牌：
   - 令牌格式正確
   - 令牌未過期
   - 令牌對應存在的使用者
2. 更新使用者的 `emailVerified` 標誌為 true
3. 返回結果頁面：
   - 成功 → 「郵箱驗證成功」+ 重導至 Dashboard 的倒計時
   - 失敗 → 「驗證連結已過期或無效」+ 提供重新發送驗證郵件的選項

**Inertia Props**：
```typescript
{
  status: 'success' | 'expired' | 'invalid'
  message: string
  redirectUrl?: string
  redirectSeconds?: number
}
```

---

### 6. GoogleOAuthCallbackPage（隱藏頁面）

**路由**：`GET /oauth/google/callback`  
**責任**：處理 Google OAuth 重導

**流程**：
1. 提取查詢參數：`code` 和 `state`
2. 驗證 state（從 session/cookie 讀取，防 CSRF）
3. 調用 `GoogleOAuthService.exchange(code)`：
   - 向 Google Token Endpoint 交換 access token
   - 調用 Google Userinfo Endpoint 取得使用者資訊
   - 以 Google ID 查找使用者
4. 結果：
   - **使用者存在** → 登入該使用者，發行 JWT
   - **使用者不存在** → 建立新帳號（Google email + 隨機密碼），設定 OAuth 提供商連結，登入
5. 成功 → 重導至 Dashboard
6. 失敗 → 重導至 LoginPage with error message

**無 UI**：頁面自動處理重導，使用者看不到此頁面

---

## OAuth 架構設計

### Google OAuth 流程

```
1. LoginPage [使用者點擊「Google 登入」]
   ↓
2. GET /oauth/google/authorize [頁面路由，生成 state]
   → 重導至 https://accounts.google.com/o/oauth2/v2/auth?...
   ↓
3. Google 授權頁面 [使用者同意]
   ↓
4. Google 重導回 /oauth/google/callback?code=XXX&state=YYY
   ↓
5. GoogleOAuthCallbackPage [驗證 state，交換 code 為 token]
   ↓
6. GoogleOAuthService.exchange(code)
   → POST https://oauth2.googleapis.com/token
   → GET https://www.googleapis.com/oauth2/v2/userinfo
   ↓
7. AuthRepository 查找或建立使用者
   ↓
8. 發行 JWT → 重導至 Dashboard
```

### 新增服務

#### GoogleOAuthService（Application Service）

**責任**：
- 交換授權碼為 access token
- 調用 Google Userinfo API
- 查找或建立使用者

**方法**：
```typescript
async exchange(code: string): Promise<{
  success: boolean
  userId?: string
  jwt?: string
  error?: string
}>
```

#### GoogleOAuthAdapter（Infrastructure Service）

**責任**：
- 管理 Google API 憑證（Client ID、Client Secret）
- 調用 Google Token Endpoint
- 調用 Google Userinfo Endpoint

**方法**：
```typescript
async exchangeCodeForToken(code: string, redirectUri: string): Promise<string>
async getUserInfo(accessToken: string): Promise<{
  id: string
  email: string
  name?: string
  picture?: string
}>
```

---

## 新增 API 端點

### GET /oauth/google/authorize

**責任**：生成 Google OAuth 授權 URL

**流程**：
1. 生成隨機 `state`（32 字元十六進制）
2. 儲存 `state` 至 session 或 signed cookie（有效期 10 分鐘）
3. 構建 Google authorize URL：
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=XXX
     redirect_uri=http://localhost:3000/oauth/google/callback
     response_type=code
     scope=openid email profile
     state=YYY
   ```
4. 重導（HTTP 302）至該 URL

**無請求體**，無認證需求。

---

## 檔案結構

```
src/Pages/
├── Auth/                          ← 新資料夾
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── ForgotPasswordPage.ts
│   ├── ResetPasswordPage.ts
│   ├── EmailVerificationPage.ts
│   └── GoogleOAuthCallbackPage.ts
├── routing/
│   ├── registerPageRoutes.ts      ← 更新，添加 Auth 路由表
│   └── ...existing...
└── ...existing...

src/Modules/Auth/
├── Application/
│   └── Services/
│       ├── GoogleOAuthService.ts  ← 新檔案
│       └── ...existing...
├── Infrastructure/
│   ├── Providers/
│   │   └── AuthServiceProvider.ts ← 更新，註冊 GoogleOAuthService
│   └── Services/
│       ├── GoogleOAuthAdapter.ts  ← 新檔案
│       └── ...existing...
├── Presentation/
│   ├── Routes/
│   │   ├── auth.routes.ts         ← 更新，添加 OAuth 端點
│   │   └── ...existing...
│   └── Requests/
│       └── ...existing...
└── ...existing...
```

---

## 路由配置

### 更新 registerPageRoutes.ts

新增至 `ADMIN_PAGE_ROUTES` 或獨立的 `AUTH_PAGE_ROUTES`：

```typescript
const AUTH_PAGE_ROUTES: readonly AuthRouteDef[] = [
  { method: 'get', path: '/login', page: AUTH_PAGE_KEYS.login, action: 'handle' },
  { method: 'post', path: '/login', page: AUTH_PAGE_KEYS.login, action: 'store' },
  { method: 'get', path: '/register', page: AUTH_PAGE_KEYS.register, action: 'handle' },
  { method: 'post', path: '/register', page: AUTH_PAGE_KEYS.register, action: 'store' },
  { method: 'get', path: '/forgot-password', page: AUTH_PAGE_KEYS.forgotPassword, action: 'handle' },
  { method: 'post', path: '/forgot-password', page: AUTH_PAGE_KEYS.forgotPassword, action: 'store' },
  { method: 'get', path: '/reset-password/:token', page: AUTH_PAGE_KEYS.resetPassword, action: 'handle' },
  { method: 'post', path: '/reset-password/:token', page: AUTH_PAGE_KEYS.resetPassword, action: 'store' },
  { method: 'get', path: '/verify-email/:token', page: AUTH_PAGE_KEYS.emailVerification, action: 'handle' },
  { method: 'get', path: '/oauth/google/callback', page: AUTH_PAGE_KEYS.googleOAuthCallback, action: 'handle' },
]
```

### 更新 auth.routes.ts（API 端點）

新增：
```typescript
export function registerAuthRoutes(router: IModuleRouter): void {
  // 既有的 POST /api/auth/login, /api/auth/register 等
  
  // 新增 OAuth 端點
  router.get('/oauth/google/authorize', new GoogleOAuthAuthorizeHandler(...))
}
```

### 新增 AuthPageKeys

在 `src/Pages/routing/pageContainerKeys.ts` 新增：
```typescript
export const AUTH_PAGE_KEYS = {
  login: 'page:auth:login',
  register: 'page:auth:register',
  forgotPassword: 'page:auth:forgotPassword',
  resetPassword: 'page:auth:resetPassword',
  emailVerification: 'page:auth:emailVerification',
  googleOAuthCallback: 'page:auth:googleOAuthCallback',
} as const
```

---

## 環境變數

新增至 `.env`：

```
# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxx
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/google/callback
```

---

## 資料流

### 登入流程

```
LoginPage (GET)
├─ 檢查是否已登入
├─ 返回 Inertia props（CSRF token、Google OAuth URL）
└─ 使用者看到表單

LoginPage (POST)
├─ 驗證輸入（Email、密碼）
├─ LoginUserService.execute(email, password)
│  ├─ 查詢使用者
│  ├─ 驗證密碼
│  ├─ 檢查帳號狀態
│  └─ 發行 JWT + refresh token
├─ 若勾選「記住我」
│  └─ 設定更長的 refresh token 有效期（如 30 天）
├─ 成功：重導至 /member/dashboard
└─ 失敗：返回錯誤訊息
```

### 註冊流程

```
RegisterPage (POST)
├─ 驗證輸入（Email、密碼、確認密碼、同意條款）
├─ RegisterUserService.execute(email, password)
│  ├─ 檢查 Email 是否已存在
│  ├─ 雜湊密碼
│  ├─ 建立新使用者
│  └─ 返回使用者 ID
├─ 若配置為需郵箱驗證：
│  ├─ 生成驗證令牌（有效期 24 小時）
│  ├─ 發送驗證郵件
│  └─ 返回「檢查你的郵箱」訊息
└─ 若配置為不需郵箱驗證：
   ├─ 發行 JWT
   └─ 重導至 Dashboard
```

### Google OAuth 流程

```
GET /oauth/google/authorize
├─ 生成隨機 state（32 字元）
├─ 儲存 state 至 session（有效期 10 分鐘）
└─ 重導至 Google authorize URL

[使用者在 Google 同意]

GET /oauth/google/callback?code=XXX&state=YYY
├─ 驗證 state（從 session 讀取）
├─ GoogleOAuthService.exchange(code)
│  ├─ GoogleOAuthAdapter.exchangeCodeForToken(code)
│  │  └─ POST 至 Google Token Endpoint
│  ├─ GoogleOAuthAdapter.getUserInfo(accessToken)
│  │  └─ GET 從 Google Userinfo Endpoint
│  ├─ 查詢使用者（以 Google ID）
│  ├─ 若使用者存在：登入
│  └─ 若使用者不存在：
│     ├─ 建立新使用者（Google email + 隨機密碼）
│     ├─ 記錄 OAuth 提供商連結
│     └─ 登入
├─ 發行 JWT + refresh token
├─ 清除 state
└─ 重導至 /member/dashboard

異常處理：
├─ state 不符 → 返回 CSRF 錯誤
├─ code 無效 → Google API 返回錯誤 → 重導至 LoginPage with error
└─ network 失敗 → 返回 5xx 錯誤
```

---

## 郵箱驗證流程（可選）

若系統配置為可選郵箱驗證：

```
使用者註冊 → RegisterPage (POST)
├─ 發送驗證郵件（含 /verify-email/:token 連結，有效期 24 小時）
└─ 返回「檢查你的郵箱」訊息

使用者點擊郵件中的連結 → GET /verify-email/:token
├─ 驗證令牌
├─ 若有效
│  ├─ 更新使用者 emailVerified=true
│  └─ 返回「驗證成功」+ 重導至登入（5 秒倒計時）
└─ 若無效或過期
   └─ 返回「驗證連結已過期」+ 提供「重新發送驗證郵件」選項
```

---

## 錯誤處理

### 登入頁面
- 無效的郵箱或密碼 → 「無效的郵箱或密碼」
- 帳號已暫停 → 「此帳號已被暫停」
- 伺服器錯誤 → 「登入失敗，請稍後重試」

### 註冊頁面
- Email 已存在 → 「此郵箱已被使用」
- 密碼不符合規則 → 「密碼強度不足」
- 未同意條款 → 「請同意服務條款」

### 密碼重置
- Email 不存在 → 「如果此郵箱已註冊，將收到重設連結」（安全訊息）
- 令牌過期 → 「重設連結已過期，請重新申請」
- 密碼驗證失敗 → （同註冊頁面）

### OAuth
- state 不符 → 「CSRF 驗證失敗，請重試」
- code 無效 → 「Google 認証失敗，請重試」
- 網路失敗 → 「連線失敗，請稍後重試」

---

## 測試策略

### 單元測試
- LoginPage.store() → 各種登入失敗情境
- RegisterPage.store() → 各種註冊失敗情境
- GoogleOAuthService.exchange() → 各種 OAuth 結果
- GoogleOAuthAdapter → Google API 呼叫

### 整合測試
- 端對端登入流程（LoginPage POST → Dashboard）
- 端對端註冊流程（RegisterPage POST → 驗證郵件 → EmailVerificationPage）
- OAuth 流程（state 驗證、code 交換、使用者建立）

### E2E 測試
- 使用者可以登入 → 存取受保護頁面
- 使用者可以註冊 → 收到驗證郵件 → 驗證成功
- Google OAuth 流程（模擬 Google 重導）

---

## 依賴與前置條件

### 已有（無需新增）
- `LoginUserService` — 登入邏輯
- `RegisterUserService` — 註冊邏輯
- `AuthRepository` — 使用者查詢
- `IPasswordHasher` — 密碼雜湊
- `IJwtTokenService` — JWT 發行

### 需要補全
- `ChangePasswordService` 或直接在 ResetPasswordPage 調用 AuthRepository
- **郵件服務**（發送驗證郵件、重設密碼郵件） — 需實現 `IMailService` 介面或使用既有的郵件框架
- **令牌管理服務**（生成、驗證、過期處理） — 重設密碼令牌、郵箱驗證令牌，可使用 JWT 或 ULID + 雜湊
- `GoogleOAuthService`（新 — Application Service）
- `GoogleOAuthAdapter`（新 — Infrastructure Service）

---

## 設計考慮

### 安全性
1. **CSRF 防護**：所有 POST 請求需 CSRF token，所有 OAuth 請求需 state
2. **密碼安全**：密碼強度檢查、雜湊存儲、無明文傳輸
3. **OAuth 安全**：Client Secret 不暴露前端，state 驗證，HTTPS 強制
4. **郵件驗證**：令牌短有效期（24 小時）、無法枚舉

### 使用者體驗
1. **清晰的錯誤訊息**：針對不同失敗原因
2. **密碼強度提示**：實時反饋
3. **社交登入降級**：Google 失敗時可回退至 Email 登入
4. **記住我**：長期 refresh token，便利但安全

### 性能
1. **單頁面載入**：避免多次資料庫查詢
2. **OAuth 快取**：短期快取 Google userinfo（1 小時）
3. **令牌簽署**：使用 JWT，無需持久化存儲

---

## 後續步驟

完成此週期後，進入第二週期（CliApi 模組），遵循相同流程：
1. 澄清需求
2. 提出設計
3. 編寫設計文檔
4. 建立實現計畫


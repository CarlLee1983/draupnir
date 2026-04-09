# 認證流程圖

## 1. 用戶認證流程 (JWT)

```
┌─────────────┐
│   用戶端     │
└──────┬──────┘
       │
       │ 1. POST /auth/login
       │    { email, password }
       ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Presentation Layer                             │
│  AuthController.login()                                          │
│  ├─ 驗證輸入 (Zod schema)                                         │
│  └─ 呼叫 Application Service                                     │
└──────────────────────────────────────────────────────────────────┘
       │
       │ 2. 執行登入用例
       ↓
┌──────────────────────────────────────────────────────────────────┐
│               Application Layer                                  │
│  AuthenticateUserService.execute(email, password)                │
│                                                                  │
│  ├─ 查詢 User: await userRepo.findByEmail(email)                │
│  │   ↓ (若不存在) → 拒絕                                          │
│  │                                                               │
│  ├─ 驗證密碼: user.verifyPassword(password)                      │
│  │   ├─ 使用 ValueObject (HashedPassword) 驗證               │
│  │   └─ (若失敗) → 拒絕                                          │
│  │                                                               │
│  ├─ 建立 AuthSession: AuthSession.create(userId)               │
│  │   └─ 生成 JWT Token                                           │
│  │                                                               │
│  ├─ 持久化: await authSessionRepo.save(session)                │
│  │   └─ 在交易中執行                                             │
│  │                                                               │
│  └─ 發佈事件: DomainEventDispatcher.dispatch(UserLoggedInEvent)│
└──────────────────────────────────────────────────────────────────┘
       │
       │ 3. 回應
       ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Presentation Layer                             │
│  200 OK                                                          │
│  {                                                               │
│    "success": true,                                              │
│    "data": {                                                     │
│      "token": "eyJ0eXAi...",      // JWT (access token)         │
│      "refreshToken": "xxxxxx",    // 刷新令牌                   │
│      "user": { id, email, role }  // 用戶資訊                   │
│    }                                                             │
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
       │
       ↓
┌─────────────┐
│   用戶端     │ 4. 保存 token，用於後續 API 呼叫
└─────────────┘


═══════════════════════════════════════════════════════════════════════


Token 構成 (JWT)
└─ Header: { alg: 'HS256', typ: 'JWT' }
└─ Payload: { userId, email, role, iat, exp, ... }  (見 TokenClaims ValueObject)
└─ Signature: HMAC-SHA256(header.payload, secret)

Token 驗證時序：
1. 接收 Authorization: Bearer {token}
2. 驗證簽名
3. 檢查過期時間 (exp)
4. 提取 userId，查詢 AuthSession
```

---

## 2. API 密鑰認證流程 (用戶密鑰)

```
┌──────────────────┐
│   CLI 客戶端      │
│   或 SDK 應用    │
└────────┬─────────┘
         │
         │ 1. GET /api/endpoint
         │    Authorization: Bearer {userApiKey}
         ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Middleware 層                                   │
│  AuthMiddleware                                                  │
│  ├─ 提取 Header: Authorization: Bearer xxxxx                    │
│  ├─ 類型判斷: 是 JWT 還是 API Key？                             │
│  │  └─ 長度、格式判斷                                            │
│  └─ 若是 API Key，轉發到 ApiKeyAuthMiddleware                  │
└──────────────────────────────────────────────────────────────────┘
         │
         │ 2. 驗證 API Key
         ↓
┌──────────────────────────────────────────────────────────────────┐
│              Application Layer                                   │
│  AuthenticateUserApiKeyService.execute(keyString)               │
│                                                                  │
│  ├─ 查詢 ApiKey: await apiKeyRepo.findByKey(keyString)          │
│  │   └─ 使用 ValueObject KeySecret (加密)                       │
│  │                                                               │
│  ├─ 檢查狀態: if (key.status === 'REVOKED') → 拒絕              │
│  │                                                               │
│  ├─ 更新最後使用時間: key.markAsUsed(now)                       │
│  │                                                               │
│  ├─ 查詢用戶: const user = await userRepo.find(key.userId)      │
│  │                                                               │
│  └─ 返回 authenticated user context                             │
└──────────────────────────────────────────────────────────────────┘
         │
         │ 3. 執行 Controller
         ↓
┌──────────────────────────────────────────────────────────────────┐
│                  Presentation Layer                              │
│  Controller 接收 IHttpContext (包含 authenticated user)           │
│  ├─ 執行業務邏輯                                                 │
│  └─ 回應 200 OK / 錯誤                                           │
└──────────────────────────────────────────────────────────────────┘

API Key 生命週期：
└─ 建立: POST /api/keys → 生成 secret，只顯示一次
└─ 儲存: 加密後存在資料庫
└─ 使用: 驗證 + 更新 last_used_at
└─ 撤銷: 標記為 REVOKED，後續拒絕
└─ 輪轉: (未來特性) 自動過期 + 生成新的
```

---

## 3. 應用級認證流程 (AppApiKey)

```
┌──────────────────────────────┐
│   SDK 應用                    │
│ (需要調用 Draupnir API)     │
└────────┬─────────────────────┘
         │
         │ 1. GET /sdk/model/call
         │    Authorization: Bearer {appApiKey}
         ↓
┌──────────────────────────────────────────────────────────────────┐
│                Middleware 層                                      │
│  SdkAppAuthMiddleware                                            │
│  ├─ 提取 appApiKey                                               │
│  └─ 轉發到 AuthenticateAppService                               │
└──────────────────────────────────────────────────────────────────┘
         │
         │ 2. 驗證應用密鑰
         ↓
┌──────────────────────────────────────────────────────────────────┐
│             Application Layer                                    │
│  AuthenticateAppService.execute(appKeyString)                   │
│                                                                  │
│  ├─ 查詢 AppApiKey: await appKeyRepo.findByKey(keyString)       │
│  │                                                               │
│  ├─ 查詢應用: const app = await appModuleRepo.find(key.appId)   │
│  │   └─ AppModule = Application 實體                             │
│  │                                                               │
│  ├─ 檢查應用所有者: app.checkOwner(organization)                │
│  │                                                               │
│  └─ 返回 app context (非 user)                                  │
└──────────────────────────────────────────────────────────────────┘
         │
         │ 3. 檢查配額並執行請求
         ↓
┌──────────────────────────────────────────────────────────────────┐
│             Application Layer                                    │
│  SdkProxyService.proxyModelCall()                                │
│                                                                  │
│  ├─ 查詢組織額度: await creditRepo.findByOrgId(appOwnerOrgId)    │
│  │   └─ 確保 balance > 0                                         │
│  │                                                               │
│  ├─ 代理請求至 Bifrost: await bifrostClient.invoke(...)         │
│  │   └─ 返回結果                                                 │
│  │                                                               │
│  ├─ 計算消費: tokens = result.usage.total_tokens                │
│  │   └─ 將 tokens 轉換為額度成本                                │
│  │                                                               │
│  ├─ 扣除額度: account.applyDeduction(cost)                      │
│  │   └─ 發佈 CreditDeductedEvent                                │
│  │                                                               │
│  └─ 回應: { result, usage, newBalance }                         │
└──────────────────────────────────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│   SDK 應用                    │
│ 接收結果 + 新餘額              │
└──────────────────────────────┘
```

---

## 4. 組織成員邀請與授權流程

```
┌──────────────┐
│ 組織管理員    │
└────┬─────────┘
     │ 1. POST /org/invite
     │    { inviteeEmail }
     ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Application Layer                              │
│  InviteUserService.execute(orgId, inviteeEmail)                │
│                                                                 │
│  ├─ 建立邀請: OrgInvitation.create()                            │
│  │   ├─ status: 'PENDING'                                       │
│  │   ├─ token: 生成唯一 token                                    │
│  │   └─ expiresAt: 現在 + 7 天                                   │
│  │                                                              │
│  ├─ 保存: await invitationRepo.save(invitation)                │
│  │                                                              │
│  └─ 發佈: InvitationCreatedEvent                                │
│      └─ 觸發發送邀請郵件                                        │
└─────────────────────────────────────────────────────────────────┘
     │
     │ 2. 邀請郵件寄送
     ↓
┌─────────────────────────────────────────────────────────────────┐
│            被邀請用戶                                            │
│ 收到郵件 + 邀請連結:                                             │
│  https://draupnir.com/accept-invite?token=xxx                  │
└─────────────────────────────────────────────────────────────────┘
     │
     │ 3. 點擊連結，接受邀請
     ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Application Layer                              │
│  AcceptInvitationService.execute(token)                         │
│                                                                 │
│  ├─ 查詢邀請: await invitationRepo.findByToken(token)          │
│  │   └─ 驗證: 存在且未過期且狀態=PENDING                        │
│  │                                                              │
│  ├─ 建立用戶或取得現有用戶                                      │
│  │                                                              │
│  ├─ 建立成員: OrgMember.create()                               │
│  │   ├─ orgId, userId, role (MEMBER)                           │
│  │   └─ status: 'ACTIVE'                                        │
│  │                                                              │
│  ├─ 更新邀請: invitation.accept()                              │
│  │   └─ status: 'ACCEPTED'                                      │
│  │                                                              │
│  └─ 發佈: MemberAddedEvent                                      │
└─────────────────────────────────────────────────────────────────┘
     │
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  用戶成為組織成員                                               │
│  ├─ 存取組織資源                                                │
│  ├─ 根據角色 (OWNER/ADMIN/MEMBER) 有不同權限                    │
│  └─ 查看組織的額度、API 密鑰等                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 認證決策樹

```
┌─────────────────────────────────────────┐
│  HTTP 請求到達                          │
│  Authorization: Bearer {token}         │
└────────────┬────────────────────────────┘
             │
             ↓
     ┌───────────────────┐
     │ 有 Authorization？ │
     └────────┬──────────┘
              │
      ┌───────┴──────────┐
      │否               │是
      ↓                  ↓
   ┌──────────────┐  ┌─────────────────────┐
   │ 拒絕 401     │  │ 判斷 token 類型      │
   │ Unauthorized│  └────┬──────────┬──────┘
   └──────────────┘      │          │
                      是 JWT?   是 API Key?
                         │          │
                    ┌────┴─┐    ┌───┴────┐
                    │yes   │no  │yes     │no
                    ↓      │    ↓        ↓
            ┌──────────┐   │  ┌────┐  拒絕
            │ JWT 驗證 │   │  │AK │  401
            │ (Profile)│   │  │驗證│  
            │ + token  │   │  └────┘
            │驗證      │   │
            └──────────┘   │
                    yes ── 403 Forbidden (無此認證類型)
                    │
                    ├─ 簽名有效？ yes →
                    ├─ 未過期？    yes →
                    └─ 用戶存在？   yes → 設定 IHttpContext
                                no → 拒絕
```

---

## 6. 權限檢查模式

### 基於角色 (Role-Based Access Control, RBAC)

```
┌─────────────────────────────────┐
│ Organization 成員角色           │
├─────────────────────────────────┤
│ OWNER  - 完全控制               │
│ ADMIN  - 管理成員、設定          │
│ MEMBER - 查看、使用資源          │
└─────────────────────────────────┘

在 Controller 或 Service 中：
  if (!await org.canMemberDelete(userId)) {
    throw new ForbiddenException('無權限刪除成員')
  }
```

### 基於資源所有權 (Ownership)

```
OrgAuthorizationHelper.canUserModifyOrg(userId, orgId)
  ├─ 查詢用戶是否是該組織成員
  ├─ 檢查角色 >= ADMIN
  └─ 回應 true/false
```

---

## 參考

- [`ddd-layered-architecture.md`](./ddd-layered-architecture.md) — 四層架構
- `src/Modules/Auth/` — 認證模組
- `src/Modules/ApiKey/` — API 密鑰管理
- `src/Modules/SdkApi/` — SDK 認證
- `src/Shared/Middleware/` — 認證中間件

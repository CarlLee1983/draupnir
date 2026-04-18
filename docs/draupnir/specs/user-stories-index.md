# Draupnir User Stories 索引

> 本索引提供三種檢視：依模組、依 Actor、依業務旅程（Epic）。
> **對標代碼日期**：2026-04-18（commit `f767eea`，建立本文件時的 HEAD）。

新人 onboarding 建議閱讀順序：
1. [personas.md](./personas.md) — 先認識五類使用者 / 非人類 actor
2. 本頁「**依業務旅程（Epic）查找**」下方表 —— 挑一條完整旅程串起讀
3. 深入某個模組時再看該模組的 `user-stories.md`

**覆蓋進度**：
- ✅ Stage 0（Pilot）：ApiKey
- ✅ Stage 1（進行中）：Auth + Profile（本批）
- ⏳ Stage 1（剩餘）：Organization、Contract、Credit、Dashboard、Reports、Alerts（Task 2~5）
- ⏳ Stage 2：AppApiKey、AppModule、SdkApi、CliApi、DevPortal（Task 6~7）

---

## 1. 依模組查找（主表）

| ID | Story | Actor | 模組 | 分區檔案 |
|---|---|---|---|---|
| [US-APIKEY-001](./3-api-keys/user-stories.md#us-apikey-001-manager-建立-api-key) | Manager 建立 API Key | Org Manager | ApiKey | [3-api-keys](./3-api-keys/user-stories.md) |
| [US-APIKEY-002](./3-api-keys/user-stories.md#us-apikey-002-manager-修改-key-label) | Manager 修改 Key Label | Org Manager | ApiKey | [3-api-keys](./3-api-keys/user-stories.md) |
| [US-APIKEY-003](./3-api-keys/user-stories.md#us-apikey-003-manager-指派-key-給成員) | Manager 指派 Key 給成員 | Org Manager | ApiKey | [3-api-keys](./3-api-keys/user-stories.md) |
| [US-APIKEY-004](./3-api-keys/user-stories.md#us-apikey-004-manager-修改-key-的權限範圍) | Manager 修改 Key 權限 | Org Manager | ApiKey | [3-api-keys](./3-api-keys/user-stories.md) |
| [US-APIKEY-005](./3-api-keys/user-stories.md#us-apikey-005-manager-撤銷-key) | Manager 撤銷 Key | Org Manager | ApiKey | [3-api-keys](./3-api-keys/user-stories.md) |
| [US-APIKEY-006](./3-api-keys/user-stories.md#us-apikey-006-manager-列出組織內全部-key) | Manager 列出 org 全部 Key | Org Manager | ApiKey | [3-api-keys](./3-api-keys/user-stories.md) |
| [US-APIKEY-007](./3-api-keys/user-stories.md#us-apikey-007-member-列出自己持有的-key) | Member 列出自己持有的 Key | Org Member | ApiKey | [3-api-keys](./3-api-keys/user-stories.md) |
| [US-APIKEY-008](./3-api-keys/user-stories.md#us-apikey-008-系統在-bifrost-鏡像失敗時自動-rollback-edge-case) | Bifrost 鏡像失敗自動 Rollback | System | ApiKey | [3-api-keys](./3-api-keys/user-stories.md) |
| [US-AUTH-001](./1-authentication/user-stories.md#us-auth-001-使用者註冊email--password) | 使用者註冊 | 新使用者 | Auth | [1-authentication](./1-authentication/user-stories.md) |
| [US-AUTH-002](./1-authentication/user-stories.md#us-auth-002-使用者登入email--password) | 使用者登入（Email + Password） | 已註冊使用者 | Auth | [1-authentication](./1-authentication/user-stories.md) |
| [US-AUTH-003](./1-authentication/user-stories.md#us-auth-003-使用者換發-access-tokenrefresh) | 使用者換發 Access Token | 已登入使用者 | Auth | [1-authentication](./1-authentication/user-stories.md) |
| [US-AUTH-004](./1-authentication/user-stories.md#us-auth-004-使用者登出撤銷當前-token) | 使用者登出 | 已登入使用者 | Auth | [1-authentication](./1-authentication/user-stories.md) |
| [US-AUTH-005](./1-authentication/user-stories.md#us-auth-005-使用者以-google-帳號登入) | 使用者以 Google 登入 | 使用者 | Auth | [1-authentication](./1-authentication/user-stories.md) |
| [US-AUTH-006](./1-authentication/user-stories.md#us-auth-006-使用者忘記密碼請求重設連結) | 使用者忘記密碼請求重設連結 | 使用者 | Auth | [1-authentication](./1-authentication/user-stories.md) |
| [US-AUTH-007](./1-authentication/user-stories.md#us-auth-007-使用者透過連結設定新密碼) | 使用者透過連結設定新密碼 | 使用者 | Auth | [1-authentication](./1-authentication/user-stories.md) |
| [US-AUTH-008](./1-authentication/user-stories.md#us-auth-008-使用者驗證-email) | 使用者驗證 Email | 新註冊使用者 | Auth | [1-authentication](./1-authentication/user-stories.md) |
| [US-AUTH-009](./1-authentication/user-stories.md#us-auth-009-使用者登入狀態修改密碼) | 使用者（登入狀態）修改密碼 | Org Manager / Member | Auth | [1-authentication](./1-authentication/user-stories.md) |
| [US-AUTH-010](./1-authentication/user-stories.md#us-auth-010-cloud-admin-列出--檢視--啟停使用者帳號) | Admin 管理使用者帳號狀態 | Cloud Admin | Auth | [1-authentication](./1-authentication/user-stories.md) |
| [US-PROFILE-001](./1-authentication/user-stories.md#us-profile-001-使用者取得與更新自己的個人資料) | 使用者取得 / 更新個人資料 | Org Manager / Member | Profile | [1-authentication](./1-authentication/user-stories.md) |

<!-- TODO(task-2): Organization story 列 -->
<!-- TODO(task-3): Contract + Credit story 列 -->
<!-- TODO(task-4): Dashboard + Reports story 列 -->
<!-- TODO(task-5): Alerts story 列 -->
<!-- TODO(task-6): AppApiKey + AppModule story 列 -->
<!-- TODO(task-7): SdkApi + CliApi + DevPortal story 列 -->

---

## 2. 依 Actor 查找

| Actor | Story IDs |
|---|---|
| **Cloud Admin** | US-AUTH-010 <!-- TODO(task-3, task-4): contract provisioning / 手動調整 credit --> |
| **Org Manager** | US-APIKEY-001, US-APIKEY-002, US-APIKEY-003, US-APIKEY-004, US-APIKEY-005, US-APIKEY-006, US-AUTH-009, US-PROFILE-001 |
| **Org Member** | US-APIKEY-007, US-AUTH-009, US-PROFILE-001 |
| **使用者（未登入 / 新註冊）** | US-AUTH-001, US-AUTH-002, US-AUTH-005, US-AUTH-006, US-AUTH-007, US-AUTH-008 |
| **使用者（已登入）** | US-AUTH-003, US-AUTH-004 |
| **Bifrost Sync Job** | <!-- TODO(task-4) --> |
| **SDK Client** | <!-- TODO(task-7) --> |
| **System（自動化）** | US-APIKEY-008 |

---

## 3. 依業務旅程（Epic）查找

| Epic | Story 序列 |
|---|---|
| **API Key 生命週期** | US-APIKEY-001 → US-APIKEY-003 → US-APIKEY-004 → US-APIKEY-002 → US-APIKEY-005 |
| **額度發放到扣款** | <!-- TODO(task-3, task-4): US-CONTRACT-001 → US-CREDIT-xxx → US-DASHBOARD-xxx --> |
| **使用者註冊到打 API** | US-AUTH-001 → US-AUTH-008 → US-AUTH-002 <!-- TODO(task-2): → US-ORG-001 加入組織 --> → US-APIKEY-007（拿到 key）<!-- TODO(task-7): → US-SDK-001 --> |
| **帳號恢復流程** | US-AUTH-006 → US-AUTH-007 |
| **鏡像失敗防禦（Bifrost 中斷）** | US-APIKEY-008 |
| **告警生命週期** | <!-- TODO(task-5) --> |

---

## 備註

- Story ID 規則：`US-<MODULE>-NNN`（MODULE 用 ApiKey 模組的短名，例如 `APIKEY`、`AUTH`、`ORG`、`CONTRACT`、`CREDIT`、`DASHBOARD`、`REPORTS`、`ALERTS`、`APPKEY`、`APPMODULE`、`SDK`、`CLI`、`DEV`）
- 每則 story 在分區檔案內有錨點連結，主表直接點 ID 進入
- Epic 連接「完整旅程」，協助 onboarding 理解跨模組互動；一則 story 可被多個 epic 引用

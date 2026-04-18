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
| [US-ORG-001](./2-user-organization/user-stories.md#us-org-001-使用者建立組織並自動升級為-manager) | 使用者建立組織（自動升 Manager） | 已登入使用者 | Organization | [2-user-organization](./2-user-organization/user-stories.md) |
| [US-ORG-002](./2-user-organization/user-stories.md#us-org-002-manager-查看--修改組織基本資料) | Manager 查看 / 修改 org 基本資料 | Org Manager | Organization | [2-user-organization](./2-user-organization/user-stories.md) |
| [US-ORG-003](./2-user-organization/user-stories.md#us-org-003-manager-邀請成員加入組織) | Manager 邀請成員 | Org Manager | Organization | [2-user-organization](./2-user-organization/user-stories.md) |
| [US-ORG-004](./2-user-organization/user-stories.md#us-org-004-受邀者接受或拒絕邀請) | 受邀者接受 / 拒絕邀請 | 受邀者 | Organization | [2-user-organization](./2-user-organization/user-stories.md) |
| [US-ORG-005](./2-user-organization/user-stories.md#us-org-005-manager-管理待處理邀請列出--撤銷) | Manager 管理待處理邀請 | Org Manager | Organization | [2-user-organization](./2-user-organization/user-stories.md) |
| [US-ORG-006](./2-user-organization/user-stories.md#us-org-006-manager-列出--移除組織成員) | Manager 列出 / 移除成員 | Org Manager | Organization | [2-user-organization](./2-user-organization/user-stories.md) |
| [US-ORG-007](./2-user-organization/user-stories.md#us-org-007-cloud-admin-調整組織成員角色) | Admin 調整成員角色 | Cloud Admin | Organization | [2-user-organization](./2-user-organization/user-stories.md) |
| [US-ORG-008](./2-user-organization/user-stories.md#us-org-008-cloud-admin-列出--啟停組織) | Admin 列出 / 啟停 orgs | Cloud Admin | Organization | [2-user-organization](./2-user-organization/user-stories.md) |
| [US-CONTRACT-001](./4-credit-billing/user-stories.md#us-contract-001-cloud-admin-建立新-contract) | Admin 建立新 Contract | Cloud Admin | Contract | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CONTRACT-002](./4-credit-billing/user-stories.md#us-contract-002-cloud-admin-啟用--修改--續約--終止-contract) | Admin Contract 生命週期 | Cloud Admin | Contract | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CONTRACT-003](./4-credit-billing/user-stories.md#us-contract-003-cloud-admin-將-contract-指派給-org) | Admin 指派 Contract 給 Org | Cloud Admin | Contract | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CONTRACT-004](./4-credit-billing/user-stories.md#us-contract-004-cloud-admin-調整-contract-的-quota-cap含按比例縮減) | Admin 調整 Quota Cap | Cloud Admin | Contract | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CONTRACT-005](./4-credit-billing/user-stories.md#us-contract-005-系統定期處理-contract-到期--即將到期) | 系統處理 Contract 到期 | System | Contract | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CONTRACT-006](./4-credit-billing/user-stories.md#us-contract-006-cloud-admin--manager-查看-contract-列表與詳細) | Admin / Manager 查看 Contract | Cloud Admin / Org Manager | Contract | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CREDIT-001](./4-credit-billing/user-stories.md#us-credit-001-cloud-admin-手動為-org-加值--退款-credit) | Admin 加值 / 退款 Credit | Cloud Admin | Credit | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CREDIT-002](./4-credit-billing/user-stories.md#us-credit-002-manager--member-查看-org-credit-餘額) | Manager / Member 看 Credit 餘額 | Org Manager / Member | Credit | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CREDIT-003](./4-credit-billing/user-stories.md#us-credit-003-manager--member-查看-credit-交易歷史) | Manager / Member 看交易歷史 | Org Manager / Member | Credit | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CREDIT-004](./4-credit-billing/user-stories.md#us-credit-004-系統依-bifrost-sync-結果扣款) | 系統依 usage 扣款 | System | Credit | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CREDIT-005](./4-credit-billing/user-stories.md#us-credit-005-系統在餘額用完時自動凍結-org-的-active-keys) | 系統餘額耗盡凍結 Key | System | Credit | [4-credit-billing](./4-credit-billing/user-stories.md) |
| [US-CREDIT-006](./4-credit-billing/user-stories.md#us-credit-006-系統在充值後自動解凍被凍結的-keys) | 系統充值後解凍 Key | System | Credit | [4-credit-billing](./4-credit-billing/user-stories.md) |

<!-- TODO(task-4): Dashboard + Reports story 列 -->
<!-- TODO(task-5): Alerts story 列 -->
<!-- TODO(task-6): AppApiKey + AppModule story 列 -->
<!-- TODO(task-7): SdkApi + CliApi + DevPortal story 列 -->

---

## 2. 依 Actor 查找

| Actor | Story IDs |
|---|---|
| **Cloud Admin** | US-AUTH-010, US-ORG-007, US-ORG-008, US-CONTRACT-001, US-CONTRACT-002, US-CONTRACT-003, US-CONTRACT-004, US-CONTRACT-006, US-CREDIT-001 |
| **Org Manager** | US-APIKEY-001, US-APIKEY-002, US-APIKEY-003, US-APIKEY-004, US-APIKEY-005, US-APIKEY-006, US-AUTH-009, US-PROFILE-001, US-ORG-002, US-ORG-003, US-ORG-005, US-ORG-006, US-CONTRACT-006, US-CREDIT-002, US-CREDIT-003 |
| **Org Member** | US-APIKEY-007, US-AUTH-009, US-PROFILE-001, US-CREDIT-002, US-CREDIT-003 |
| **受邀者（未必已入 org）** | US-ORG-004 |
| **使用者（未登入 / 新註冊）** | US-AUTH-001, US-AUTH-002, US-AUTH-005, US-AUTH-006, US-AUTH-007, US-AUTH-008 |
| **使用者（已登入，尚未建立 / 加入 org）** | US-AUTH-003, US-AUTH-004, US-ORG-001 |
| **Bifrost Sync Job** | <!-- TODO(task-4) --> |
| **SDK Client** | <!-- TODO(task-7) --> |
| **System（自動化）** | US-APIKEY-008, US-CONTRACT-005, US-CREDIT-004, US-CREDIT-005, US-CREDIT-006 |

---

## 3. 依業務旅程（Epic）查找

| Epic | Story 序列 |
|---|---|
| **API Key 生命週期** | US-APIKEY-001 → US-APIKEY-003 → US-APIKEY-004 → US-APIKEY-002 → US-APIKEY-005 |
| **額度發放到扣款** | US-CONTRACT-001 → US-CONTRACT-002（啟用）→ US-CONTRACT-003（指派 org）→ US-APIKEY-001（Manager 分配 key quota）→ US-CREDIT-004（系統扣款）<!-- TODO(task-4): → US-DASHBOARD-xxx Bifrost Sync --> |
| **額度耗盡與恢復** | US-CREDIT-004 → US-CREDIT-005（凍結）→ US-CREDIT-001（Admin 加值）→ US-CREDIT-006（解凍）|
| **Contract 調整與硬擋** | US-CONTRACT-004（調 cap）→ US-APIKEY-001（影響 key 額度預檢）|
| **Contract 到期** | US-CONTRACT-005 <!-- TODO(task-5): → US-ALERTS-xxx 發通知 --> |
| **使用者註冊到打 API（自建 org 路徑）** | US-AUTH-001 → US-AUTH-008 → US-AUTH-002 → US-ORG-001 → US-APIKEY-001 <!-- TODO(task-7): → US-SDK-001 --> |
| **使用者註冊到打 API（受邀加入 org 路徑）** | US-AUTH-001 → US-AUTH-008 → US-AUTH-002 → US-ORG-004（接受邀請）→ US-APIKEY-007（收到 key）<!-- TODO(task-7): → US-SDK-001 --> |
| **帳號恢復流程** | US-AUTH-006 → US-AUTH-007 |
| **組織組建（Manager 視角）** | US-ORG-001 → US-ORG-002 → US-ORG-003 → US-ORG-005 → US-ORG-006 |
| **Admin 組織治理** | US-ORG-008 → US-ORG-007 → US-AUTH-010 |
| **鏡像失敗防禦（Bifrost 中斷）** | US-APIKEY-008 |
| **告警生命週期** | <!-- TODO(task-5) --> |

---

## 備註

- Story ID 規則：`US-<MODULE>-NNN`（MODULE 用 ApiKey 模組的短名，例如 `APIKEY`、`AUTH`、`ORG`、`CONTRACT`、`CREDIT`、`DASHBOARD`、`REPORTS`、`ALERTS`、`APPKEY`、`APPMODULE`、`SDK`、`CLI`、`DEV`）
- 每則 story 在分區檔案內有錨點連結，主表直接點 ID 進入
- Epic 連接「完整旅程」，協助 onboarding 理解跨模組互動；一則 story 可被多個 epic 引用

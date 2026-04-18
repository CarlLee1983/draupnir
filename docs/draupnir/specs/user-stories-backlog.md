# User Stories 覆蓋缺口 Backlog

> 從 [user-stories-index.md](./user-stories-index.md) 與各模組 `user-stories.md` 的「已知覆蓋缺口」章節彙整。
> **建立日期**：2026-04-18（commit `5c50c95`）。每次有新缺口解決時，請同步移除此處對應項目。

## 讀法

- 每項標題格式：**[優先級] 缺口名稱（所屬模組）**
- 狀態：`⏳ 未處理` / `🏗 進行中` / `✅ 已解決（附 commit / story ID）`
- 完成後移至檔尾的「已解決紀錄」區

**優先級定義**：
- **A**：安全 / 財務完整性 / 商業阻擋——須盡快處理
- **B**：功能完整性 / UX 明顯缺口——排入近期 sprint
- **C**：Nice-to-have / 未來再說——暫存

---

### ⏳ A4. Webhook-only 通道失敗升級（Alerts）
- **來源**：4-credit-billing/user-stories.md
- **現況**：email 成功 + 所有 webhook 失敗時，只記錄 delivery 失敗、不升級通知
- **風險**：嚴重告警可能被忽略
- **預估工作**：在 `SendAlertService` 後追加失敗統計與升級策略；US-ALERTS-004 Key rules 延伸

---

## 🅱 Priority B（功能完整性）

### ⏳ B1. Device Verification / 2FA（Auth）
- **來源**：1-authentication/user-stories.md
- **現況**：`VerifyDevicePage` 存在但 v1 流程未收斂
- **預估工作**：確認 2FA 產品需求 → 補 `US-AUTH-011`（或 `US-AUTH-012`）

### ⏳ B2. Change Email 完整流程（Auth）
- **來源**：1-authentication/user-stories.md
- **現況**：尚未實作（含新/舊 email 雙向驗證）
- **預估工作**：設計雙向驗證流程 + 新 service + story

### ⏳ B3. Member 自行離開 Org（Organization）
- **來源**：2-user-organization/user-stories.md
- **現況**：僅能由 Manager 執行 remove（US-ORG-006）
- **預估工作**：新 `LeaveOrgService`（含最後一位 Manager 保護）+ story `US-ORG-009`

### ⏳ B4. 多 Org 使用者切換 UX（Organization）
- **來源**：2-user-organization/user-stories.md
- **現況**：`GetUserMembershipService` 只回首個 active membership
- **預估工作**：API 回多 membership + 前端 org switcher + 新 story

### ⏳ B5. Cloud Admin 跨 Org 查 Key（ApiKey）
- **來源**：3-api-keys/user-stories.md
- **現況**：`ListApiKeysService` 走 `requireOrgMembership`，admin 跨 org 沒有獨立路徑
- **預估工作**：Admin Portal 新建 `/admin/keys` + 新 service 或放寬 authz + 新 story

### ⏳ B6. UpdateApiKeyBudget Presentation（ApiKey）
- **來源**：3-api-keys/user-stories.md + 4-credit-billing 的「slack-based reallocation」
- **現況**：Service 已實作，但 Manager Portal 沒 UI，目前 budget 只能在 create 時設
- **預估工作**：Manager Portal `/manager/api-keys/:keyId/budget` + 新 story `US-APIKEY-009`；同時解鎖 Manager slack-based reallocation epic

### ⏳ B7. Manager 專屬 Contract 詳細頁（Contract）
- **來源**：4-credit-billing/user-stories.md
- **現況**：`/member/contracts` 共用 Member 視圖
- **預估工作**：Manager Portal `/manager/contracts/:id` + UI 差異化

### ⏳ B8. 邀請重複 Email 的行為收斂（Organization）
- **來源**：2-user-organization/user-stories.md
- **現況**：Service 接受建立；接受時才回錯
- **預估工作**：`InviteMemberService` 提前檢查；US-ORG-003 Key rules 更新

### ⏳ B9. Alert Tier 自訂閾值百分比（Alerts）
- **來源**：4-credit-billing/user-stories.md
- **現況**：`ThresholdTier` 只支援 warning / critical 兩階
- **預估工作**：擴充 value object 支援 custom percent；US-ALERTS-001/004 更新

### ⏳ B10. SdkApi Streaming / SSE（SdkApi）
- **來源**：7-developer-api/user-stories.md
- **現況**：`ProxyModelCall` 主要處理完整回應
- **預估工作**：新 `ProxyStreamingModelCall` use case + SSE forwarding；US-SDK-001 延伸或新 story

### ⏳ B11. CLI Token 專屬 Refresh 路徑（CliApi）
- **來源**：7-developer-api/user-stories.md
- **現況**：Device Flow 後續 token 生命週期走 Auth 模組的 access / refresh
- **決策**：是否保留 CLI 專屬 refresh（需評估 UX）；**可能標記為「不做」**

---

## 🆑 Priority C（Nice-to-have / 未來再說）

### ⏳ C1. Admin 手動扣除 Credit（Credit）
- 目前靠反向 refund 實現；若要獨立語意需新 service + story

### ⏳ C2. 已寄送 Report 的歷史紀錄（Reports）
- Reports 只管 schedule config，不保留 render 過的 PDF
- 需求不明確：是否有 audit 需求？

### ⏳ C3. Reports 排程失敗重試（Reports）
- 目前依賴 scheduler 下次 tick；可考慮 exponential backoff retry

### ⏳ C4. DevPortal App 生命週期（DevPortal）
- Rename / transfer / delete 尚未提供
- 等有客戶反饋再做

### ⏳ C5. GetApiDocs 版本控制（DevPortal）
- 目前單一 endpoint；未來若需要 `/docs/v1`、`/docs/v2` 再加

### ⏳ C6. AppModule Disable 後既有 Subscriptions 清理（AppModule）
- 目前 runtime 拒就好；是否需要主動 mark subscriptions inactive 有待討論

---

## 交叉依賴圖

- **B6 解決** → 連帶解 **4-credit-billing 的 slack-based reallocation 缺口**
- **B5 解決** → Cloud Admin Actor 在索引表的 story 清單會擴充
- **A2 收緊後** → US-APPKEY-001/002/003、US-DEV-002 Key rules 需同步更新

---

## 已解決紀錄

<!-- 格式：
### ✅ <原缺口編號>. <原標題> — <解決 commit> / <對應新 story>
- **解法摘要**：...
- **對應 story**：`US-XXX-NNN`
- **關閉日期**：YYYY-MM-DD
-->

### ✅ A1. Session 管理（登入裝置列表 + 全部登出）（Auth）— `US-AUTH-011`
- **解法摘要**：新增 `ListSessionsService`、`RevokeAllSessionsService`；`GET /api/auth/sessions`、`POST /api/auth/logout-all`；Manager/Member 設定頁「登入工作階段」區塊與 `POST …/settings/sessions/revoke-all`。改密碼實際上早已會 `revokeAllByUserId`（與 backlog 舊述不一致處已於 `1-authentication/user-stories.md` US-AUTH-009 更正）。
- **對應 story**：`US-AUTH-011`
- **關閉日期**：2026-04-18

### ✅ A2. AppApiKey 授權收斂（AppApiKey）— 本次實作
- **解法摘要**：將 AppApiKey 的 issue / rotate / revoke / scope 寫入路徑收斂為 `requireOrgManager`；DevPortal 的 App-Key issue / revoke 也同步收斂到同一套 manager-only 授權，避免 org-wide 與 app-level key 管理規則分叉。
- **對應 story**：`US-APPKEY-001~003`、`US-DEV-002`
- **關閉日期**：2026-04-18

### ✅ A3. 逾期未扣款 Backfill（Credit + Dashboard）— 本次實作 / `US-CREDIT-007`
- **解法摘要**：新增 `ApplyUsageChargesService` 以 `usage_record.id` 做 deduction 去重；`BifrostSyncService.backfill(startTime, endTime)` 支援指定時間區間重跑且不推進 cursor，並以 `limit + offset` 分頁取完整個時間窗；新增 admin-only `POST /api/dashboard/bifrost-sync/backfill` 手動補救入口。
- **對應 story**：`US-CREDIT-007`
- **關閉日期**：2026-04-18

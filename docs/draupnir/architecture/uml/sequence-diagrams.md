# Draupnir 時序圖（Sequence Diagrams）

**文檔版本**: v1.0  
**更新日期**: 2026-04-22  
**目的**: 展現關鍵業務流程的時間順序與組件交互

---

## 概述

本文檔覆蓋 Draupnir 的核心業務流程時序圖。認證流程見 [`auth-flow-diagrams.md`](./auth-flow-diagrams.md)。

---

## 1. API 請求與計費流程（SDK/CliApi Gateway）

### 流程概述
End User 發起 API 請求 → 驗證 → 轉發至 Bifrost → 非同步扣費 → 告警評估

```mermaid
sequenceDiagram
    participant User as SDK/CLI User
    participant Gateway as SdkApi Gateway
    participant Auth as Auth Module
    participant Credit as Credit Module
    participant Bifrost as Bifrost AI
    participant BGJob as Background Job
    participant Event as Domain Event

    User->>Gateway: POST /sdk/v1/chat/completions<br/>Header: Authorization: Bearer key_xxx

    Note over Gateway: 1️⃣ 認證檢查
    Gateway->>Auth: validateApiKey(key_xxx)
    Auth-->>Gateway: ApiKey + Organization Info

    Note over Gateway: 2️⃣ 組織狀態驗證
    Gateway->>Auth: checkOrganizationStatus()
    Auth-->>Gateway: { status: 'active' }

    Note over Gateway: 3️⃣ 模組訂閱驗證
    Gateway->>Credit: checkModuleSubscription(org_id)
    Credit-->>Gateway: { subscribed: true }

    Note over Gateway: 4️⃣ 額度檢查（非嚴格）
    Gateway->>Credit: estimateBalance(org_id)
    Credit-->>Gateway: { balance: 500.00 }

    Note over Gateway: 5️⃣ 轉發至 Bifrost
    Gateway->>Bifrost: POST /v1/chat/completions<br/>(用 Virtual Key 代理)
    Bifrost-->>Gateway: { choices: [...], usage: { ... } }

    Note over Gateway: 6️⃣ 記錄用量（非同步）
    Gateway->>BGJob: enqueueTask('credit.deduct',<br/>{ key_id, usage_info })

    Note over Gateway: 7️⃣ 返回響應
    Gateway-->>User: { choices: [...], usage: { ... } }

    Note over BGJob: === 後台異步 ===

    BGJob->>Credit: deductCredit(key_id, usage_info)
    Credit->>Credit: applyDeduction()
    Credit-->>BGJob: ✅ Deduction Success

    Note over BGJob: 8️⃣ 投遞事件
    BGJob->>Event: dispatch(CreditDeductedEvent)
    Event-->>BGJob: ✅ Event Dispatched

    Note over Event: 9️⃣ 觸發告警評估
    Event->>Event: trigger(EvaluateThresholdsService)
```

### 關鍵特性

| 階段 | 操作 | 同步/非同步 | 對應模組 |
|------|------|-----------|---------|
| **驗證** | API Key 有效性 | 同步 | Auth, ApiKey |
| **檢查** | 組織狀態、模組訂閱、額度預估 | 同步 | Auth, Credit, AppModule |
| **轉發** | 代理至 Bifrost Virtual Key | 同步 | SdkApi, Bifrost |
| **扣費** | 扣除額度、記錄審計日誌 | **非同步** | Credit, Background Job |
| **通知** | 投遞事件、觸發告警評估 | **非同步** | Domain Event, Alerts |

### 錯誤場景

```mermaid
sequenceDiagram
    participant User as SDK User
    participant Gateway as SdkApi Gateway
    participant Credit as Credit Module

    User->>Gateway: API Request

    alt Invalid API Key
        Gateway-->>User: 401 Unauthorized
    else Organization Inactive
        Gateway-->>User: 403 Forbidden
    else Module Not Subscribed
        Gateway-->>User: 402 Payment Required
    else Balance Depleted
        Gateway->>Credit: checkBalance()
        Credit-->>Gateway: { balance: 0 }
        Gateway-->>User: 402 Insufficient Credit
    end
```

---

## 2. Bifrost 用量同步與落庫流程

### 流程概述
Scheduler → Bifrost Gateway → 映射本地 API Key → 寫入 `usage_records` → 發出同步完成事件

```mermaid
sequenceDiagram
    participant Scheduler as IScheduler
    participant Sync as BifrostSyncService
    participant Gateway as ILLMGatewayClient
    participant ApiKeys as IApiKeyRepository
    participant UsageRepo as IUsageRepository
    participant DB as usage_records / quarantined_logs / sync_cursors
    participant EventBus as DomainEventDispatcher

    Note over Scheduler: 定時觸發（預設每 5 分鐘）
    Scheduler->>Sync: sync()
    Sync->>Sync: 讀取 bifrost_logs cursor

    loop 分頁抓取
        Sync->>Gateway: getUsageLogs([], {<br/>startTime, endTime, limit, offset })
        Gateway-->>Sync: logs[]

        loop 每筆 log
            Sync->>ApiKeys: findByBifrostVirtualKeyId(log.keyId)

            alt 找得到對應 key
                Sync->>UsageRepo: upsert(UsageRecordInsert)
                UsageRepo->>DB: insertOrIgnore into usage_records
            else 找不到對應 key
                Sync->>DB: insert quarantined_logs
            end
        end
    end

    Sync->>DB: advance sync_cursor
    opt 有成功寫入
        Sync->>EventBus: dispatch(BifrostSyncCompletedEvent)
    end
```

### 關鍵特性

| 階段 | 操作 | 同步/非同步 | 對應模組 |
|------|------|-----------|---------|
| **抓取** | 透過 `ILLMGatewayClient.getUsageLogs()` 拉取原始 usage logs | 同步 | Dashboard, Gateway |
| **映射** | 以 `virtualKeyId` 解析本地 `apiKeyId` | 同步 | Dashboard, ApiKey |
| **入庫** | 寫入 `usage_records` / `quarantined_logs` / `sync_cursors` | 同步 | Dashboard |
| **通知** | 發佈 `BifrostSyncCompletedEvent` | 非同步 | Domain Event, Credit, Alerts |

### 錯誤場景

```mermaid
sequenceDiagram
    participant Sync as BifrostSyncService
    participant Gateway as ILLMGatewayClient

    Sync->>Gateway: getUsageLogs(...)

    alt Gateway timeout / network error
        Gateway-->>Sync: error
        Sync-->>Sync: 回傳 { synced: 0, quarantined: 0, affectedOrgIds: [] }
    else Timeout reached
        Sync-->>Sync: 結束此次 sync，等待下次排程
    end
```

---

## 3. 告警評估與通知流程

### 流程概述
Bifrost 同步完成 → 監聽事件 → 掃描告警配置 → 評估閾值 → 觸發通知

```mermaid
sequenceDiagram
    participant Bifrost as Bifrost Sync
    participant EventBus as Domain Event Bus
    participant Alerts as Alerts Module
    participant Credit as Credit Module
    participant Notifier as Notification Service
    participant Email as Email Service
    participant Webhook as External Webhook

    Bifrost->>EventBus: publish(BifrostSyncCompletedEvent<br/>{ org_id, total_usage, ... })

    Note over EventBus: 事件發佈至 EventBus

    EventBus->>Alerts: onBifrostSyncCompleted(event)

    Note over Alerts: 1️⃣ 掃描組織告警配置
    Alerts->>Credit: getOrganizationAlerts(org_id)
    Credit-->>Alerts: AlertConfig[]

    loop 遍歷每個告警配置
        Note over Alerts: 2️⃣ 評估閾值

        alt 類型：Balance Low（餘額預警）
            Alerts->>Credit: getCurrentBalance(org_id)
            Credit-->>Alerts: balance: 50.00
            Alerts->>Alerts: check(balance < threshold_80%)
            Alerts->>Alerts: ✅ TRIGGERED

        else 類型：Monthly Usage（月度用量預警）
            Alerts->>Credit: getMonthlyUsage(org_id)
            Credit-->>Alerts: usage: 8000
            Alerts->>Alerts: check(usage > threshold_10000)
            Alerts->>Alerts: ❌ NOT TRIGGERED

        else 類型：Contract Expiring（合約到期預警）
            Alerts->>Credit: getContractExpiry(org_id)
            Credit-->>Alerts: expiry_date: 2026-04-25
            Alerts->>Alerts: check(days_until_expiry < 7)
            Alerts->>Alerts: ⚠️ PENDING
        end

        alt 觸發告警（TRIGGERED）
            Note over Alerts: 3️⃣ 投遞通知任務

            Alerts->>Notifier: createNotificationTask({<br/>alert_id, org_id, recipients, type })

            alt 通知方式：Email
                Notifier->>Email: sendAlert({<br/>to: admin@example.com,<br/>subject: 'Balance Low',<br/>body: '...' })
                Email-->>Notifier: ✅ Email Queued
                Notifier-->>Alerts: ✅ Notification Sent

            else 通知方式：Webhook
                Notifier->>Webhook: POST https://app.example.com/webhooks/alert<br/>Body: { event: 'balance.low', ... }<br/>X-Signature: HMAC-SHA256(body, secret)
                Webhook-->>Notifier: 200 OK
                Notifier-->>Alerts: ✅ Webhook Delivered
            end

            Note over Alerts: 4️⃣ 記錄告警事件
            Alerts->>Credit: recordAlertEvent({<br/>alert_id, org_id, timestamp, status })
        end
    end

    Note over Alerts: ✅ 告警評估完成
```

### 觀察者模式（Webhook 簽名驗證）

外部應用接收到 Webhook 時的驗證流程：

```mermaid
sequenceDiagram
    participant Notifier as Draupnir Notifier
    participant Webhook as App Webhook Server
    participant AppService as App Service

    Notifier->>Notifier: payload = JSON.stringify(event)
    Notifier->>Notifier: signature = HMAC-SHA256(payload, webhook_secret)
    Notifier->>Webhook: POST /alerts<br/>X-Signature: signature<br/>Body: payload

    Webhook->>Webhook: signature_rcvd = Header['X-Signature']
    Webhook->>Webhook: payload = Body
    Webhook->>Webhook: signature_computed = HMAC-SHA256(payload, stored_secret)
    Webhook->>Webhook: compare(signature_rcvd, signature_computed)

    alt 簽名驗證成功
        Webhook->>AppService: processAlert(event)
        AppService-->>Webhook: ✅ Processed
        Webhook-->>Notifier: 200 OK
    else 簽名驗證失敗
        Webhook-->>Notifier: 401 Unauthorized
    end
```

### 告警狀態轉移

```mermaid
stateDiagram-v2
    [*] --> Created
    Created --> Evaluated: Bifrost Sync Event
    Evaluated --> Triggered: Threshold Met
    Evaluated --> Not_Triggered: Threshold Not Met
    Triggered --> Notified: Send Email/Webhook
    Notified --> Acknowledged: User Clicks
    Acknowledged --> Resolved: Action Taken
    Resolved --> Created: Next Sync Cycle
```

---

## 4. 報表生成與投遞流程

### 流程概述
定時任務 → 聚合指標 → 生成 PDF → 發送郵件

```mermaid
sequenceDiagram
    participant Scheduler as IScheduler
    participant Reports as Reports Module
    participant Dashboard as Dashboard Module
    participant PDF as PDF Generator
    participant Email as Email Service

    Note over Scheduler: 定時觸發（每月 1 日 09:00）
    Scheduler->>Reports: execute(GenerateMonthlyReportJob)

    Note over Reports: 1️⃣ 識別報表對象
    Reports->>Reports: getOrganizationsForReport()
    Reports->>Reports: Return: [ org_1, org_2, org_3, ... ]

    loop 遍歷每個組織
        Note over Reports: 2️⃣ 聚合指標數據

        Reports->>Dashboard: getMetrics({<br/>org_id, period: 'month' })
        Dashboard-->>Reports: {<br/>total_tokens: 50000,<br/>model_distribution: { ... },<br/>cost_summary: { ... },<br/>kpi: { ... } }

        Note over Reports: 3️⃣ 生成 PDF
        Reports->>PDF: generate({<br/>template: 'monthly_report.html',<br/>data: metrics,<br/>org_name: 'Acme Inc.' })

        PDF->>PDF: render(HTML → PDF)
        PDF-->>Reports: file_path: /tmp/report_org_1.pdf

        Note over Reports: 4️⃣ 發送郵件
        Reports->>Email: sendReportEmail({<br/>org_id,<br/>recipients: [admin@acme.com],<br/>subject: 'Monthly Report - 2026-04',<br/>attachment: file_path })

        Email->>Email: addAttachment(file_path)
        Email->>Email: queue()
        Email-->>Reports: ✅ Email Queued

        Note over Reports: 5️⃣ 記錄任務
        Reports->>Reports: recordReportGeneration({<br/>org_id, report_type: 'monthly',<br/>status: 'sent' })
    end

    Note over Reports: ✅ 所有報表生成完成
```

### 報表模板結構

```
Monthly Report Template
├─ 標題：Draupnir Usage Report - 2026-04
├─ 摘要：
│  ├─ 計費期間：2026-04-01 ~ 2026-04-30
│  ├─ 組織名稱：Acme Inc.
│  ├─ 總消耗 Token：50,000
│  └─ 月度成本：$250
├─ 模型分佈（圖表）
├─ 成本趨勢（曲線圖）
├─ KPI：
│  ├─ Tokens/Day：~1,667
│  ├─ Cost/Million-Token：$5.00
│  └─ Peak Usage Hour：14:00
└─ 建議：
   ├─ 若用量持續增長，考慮升級計畫
   └─ 可通過 API 優化減少無效調用
```

---

## 5. 成員邀請流程

### 流程概述
生成邀請 Token → 發送郵件 → 點擊驗證 → 自動加入組織

```mermaid
sequenceDiagram
    participant Admin as Admin Portal
    participant OrgModule as Organization Module
    participant Auth as Auth Module
    participant Email as Email Service
    participant Invitee as 受邀者郵箱
    participant Browser as 受邀者瀏覽器
    participant UserModule as User/Profile Module

    Admin->>OrgModule: inviteMember({<br/>org_id, email: 'newdev@example.com',<br/>role: 'Developer' })

    Note over OrgModule: 1️⃣ 生成邀請 Token
    OrgModule->>OrgModule: token = generateEncryptedToken({<br/>org_id, email, role, exp: +30d })
    OrgModule->>OrgModule: save(Invitation{ org_id, email, token, status: 'pending' })

    Note over OrgModule: 2️⃣ 構建邀請連結
    OrgModule->>OrgModule: inviteUrl = `https://draupnir.example.com/invite?token=${token}`

    Note over OrgModule: 3️⃣ 發送邀請郵件
    OrgModule->>Email: sendInvitationEmail({<br/>to: 'newdev@example.com',<br/>inviteUrl,<br/>org_name: 'Acme Inc.' })

    Email->>Email: render(invitation_template)
    Email->>Email: queue()
    Email-->>OrgModule: ✅ Email Queued

    Admin-->>Admin: ✅ 邀請已發送

    Note over Invitee: 受邀者收到郵件

    Invitee->>Browser: 點擊邀請連結
    Browser->>Browser: GET /invite?token=xxx

    Note over Browser: 4️⃣ 驗證 Token & 重定向
    Browser->>Auth: validateInvitationToken(token)
    Auth->>OrgModule: getInvitation(token)
    OrgModule-->>Auth: Invitation{ org_id, email, role }

    alt Token 有效
        Auth-->>Browser: ✅ Token Valid, Redirect
        Browser->>Browser: Redirect to /register?invite_token=xxx
        Browser->>Browser: Show Sign-Up Form (Email Pre-filled)

        Note over Browser: 5️⃣ 完成註冊
        Browser->>UserModule: register({<br/>email: 'newdev@example.com',<br/>password, name, invite_token })

        UserModule->>Auth: createUser(...)
        Auth-->>UserModule: user_id: 123

        Note over UserModule: 6️⃣ 自動加入組織
        UserModule->>OrgModule: addMember({<br/>org_id, user_id, role: 'Developer' })
        OrgModule->>OrgModule: createMember(org_id, user_id, role)
        OrgModule-->>UserModule: ✅ Member Added

        Note over UserModule: 7️⃣ 標記邀請已使用
        UserModule->>OrgModule: markInvitationUsed(token)
        OrgModule-->>UserModule: ✅ Invitation Closed

        UserModule-->>Browser: ✅ Registration Complete
        Browser-->>Browser: Redirect to Dashboard

    else Token 已過期或不存在
        Auth-->>Browser: ❌ Invalid or Expired Token
        Browser-->>Browser: Show Error Page with Retry Option
    end
```

### 邀請狀態流轉

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Accepted: 受邀者點擊連結
    Accepted --> Registered: 受邀者完成註冊
    Registered --> Completed: 自動加入組織
    Completed --> [*]
    
    Pending --> Expired: 超過 30 天
    Expired --> [*]
    
    Pending --> Revoked: Admin 撤銷邀請
    Revoked --> [*]
```

---

## 6. 合約到期與續約流程

### 流程概述
檢測合約即將過期 → 發送提醒 → Admin 續約 → 更新有效期

```mermaid
sequenceDiagram
    participant Scheduler as Contract Scheduler
    participant Contract as Contract Module
    participant Credit as Credit Module
    participant Email as Email Service
    participant Admin as Admin Portal

    Note over Scheduler: 定時掃描（每日 09:00）
    Scheduler->>Contract: scanExpiringContracts()

    Note over Contract: 1️⃣ 查詢即將過期合約
    Contract->>Contract: find({<br/>status: 'active',<br/>expiry_date: between(today, today+7) })
    Contract-->>Scheduler: [ Contract_1, Contract_2, ... ]

    loop 遍歷每個即將過期的合約
        Note over Contract: 2️⃣ 檢查是否已發送提醒
        Contract->>Contract: getLastReminderDate(contract_id)

        alt 超過 24 小時未提醒
            Note over Contract: 3️⃣ 發送到期提醒
            Contract->>Email: sendExpiringContractAlert({<br/>org_id, contract_id,<br/>expiry_date: '2026-04-25' })
            Email-->>Contract: ✅ Email Queued

            Note over Contract: 4️⃣ 記錄提醒時間
            Contract->>Contract: updateLastReminder(contract_id)
        end
    end

    Note over Scheduler: ✅ 掃描完成

    Note over Admin: Admin 登錄平台

    Admin->>Admin: 收到到期提醒郵件
    Admin->>Admin: 訪問 Admin Portal → 合約管理

    Note over Admin: 5️⃣ 查看並續約
    Admin->>Contract: renewContract({<br/>contract_id,<br/>extend_months: 12 })

    Note over Contract: 6️⃣ 驗證續約條件
    Contract->>Credit: validateRenewalEligibility(contract_id)
    Credit-->>Contract: ✅ Eligible

    Note over Contract: 7️⃣ 更新合約
    Contract->>Contract: applyRenewal({<br/>new_expiry: today + 12months,<br/>status: 'active' })
    Contract->>Contract: recordAuditLog('contract.renewed')
    Contract-->>Admin: ✅ Contract Renewed

    Note over Admin: 8️⃣ 可選：發送確認郵件
    Contract->>Email: sendRenewalConfirmation({<br/>org_id, new_expiry })
    Email-->>Contract: ✅ Email Queued

    Admin-->>Admin: ✅ 續約完成
```

---

## 6. 時序圖使用指南

### 何時使用時序圖
- ✅ 理解跨模組的同步/非同步交互
- ✅ 設計新功能時梳理時間順序
- ✅ 故障排查與性能優化
- ✅ 開發者入職培訓

### 如何閱讀
1. **縱軸** = 參與者（Actor、Module、Service）
2. **橫軸** = 時間線
3. **箭頭** = 調用關係（實線 = 同步，虛線 = 異步返回）
4. **標籤** = 方法名、參數、返回值

### 異步任務模式

本系統大量使用**後台異步任務**以降低主路徑延遲：

| 場景 | 同步 | 異步 | 原因 |
|------|------|------|------|
| API 請求 → 轉發 Bifrost | ✅ | ❌ | 用戶須等待響應 |
| API 請求 → 扣費記錄 | ❌ | ✅ | 無需阻塞主路徑 |
| 告警評估 | ❌ | ✅ | 耗時聚合操作 |
| 報表生成 | ❌ | ✅ | 長耗時 PDF 生成 |
| 郵件投遞 | ❌ | ✅ | 可重試機制 |

---

## 相關文檔

- [`auth-flow-diagrams.md`](./auth-flow-diagrams.md) — JWT、OAuth、API Key 認證流程
- [`ddd-layered-architecture.md`](./ddd-layered-architecture.md) — 模組結構
- [`domain-events.md`](../knowledge/domain-events.md) — Domain Events 實踐
- [`use-case-diagram.md`](./use-case-diagram.md) — 使用案例圖

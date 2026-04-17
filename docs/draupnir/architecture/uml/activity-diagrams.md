# Draupnir 活動圖（Activity Diagrams）

**文檔版本**: v1.0  
**更新日期**: 2026-04-17  
**目的**: 展現複雜業務流程中的決策分支、並行活動與異常處理路徑

---

## 概述

活動圖適合展現：
- 複雜決策流程（多分支條件判斷）
- 並行活動（多個操作同時進行）
- 異常與恢復路徑
- 業務流程中的等待點

---

## 1. API 請求完整流程（含異常分支）

```mermaid
graph TD
    Start([End User 發起 API 請求]) --> BuildRequest["構建請求<br/>Header: Auth Token<br/>Body: Parameters"]
    
    BuildRequest --> ValidateAuth{"驗證<br/>API Key 有效性"}
    
    ValidateAuth -->|❌ Invalid| ErrorAuth["❌ 401 Unauthorized<br/>Response: Invalid Key"]
    ErrorAuth --> End1([請求終止])
    
    ValidateAuth -->|✅ Valid| CheckOrg{"檢查<br/>組織狀態"}
    
    CheckOrg -->|❌ Inactive| ErrorOrg["❌ 403 Forbidden<br/>Org Suspended"]
    ErrorOrg --> End2([請求終止])
    
    CheckOrg -->|✅ Active| CheckModule{"檢查<br/>模組訂閱"}
    
    CheckModule -->|❌ Not Subscribed| ErrorModule["❌ 402 Payment Required<br/>Module Not Subscribed"]
    ErrorModule --> End3([請求終止])
    
    CheckModule -->|✅ Subscribed| CheckBalance{"檢查<br/>額度估值"}
    
    CheckBalance -->|⚠️ Low| BalanceWarn["⚠️ 記錄警告<br/>但允許通過"]
    BalanceWarn --> ProxyReq
    
    CheckBalance -->|✅ Sufficient| ProxyReq["轉發至 Bifrost<br/>使用 Virtual Key"]
    
    ProxyReq --> CallBifrost["調用<br/>Bifrost API"]
    
    CallBifrost -->|Success| BifrostResp["✅ 接收響應<br/>usage_info: {...}"]
    CallBifrost -->|Timeout/Error| BifrostError["❌ Bifrost 錯誤<br/>返回 500"]
    
    BifrostError --> End4([請求終止])
    
    BifrostResp --> QueueDeduction["非同步：投遞<br/>扣費任務至隊列"]
    
    QueueDeduction --> ReturnResp["返回成功響應<br/>給 End User<br/>HTTP 200"]
    
    ReturnResp --> AsyncStart["[非同步處理開始]"]
    
    AsyncStart --> FindKey{"查詢<br/>API Key 記錄"}
    FindKey -->|Not Found| LogError["❌ 記錄錯誤<br/>Key 被刪除？"]
    LogError --> AsyncEnd1([異步終止])
    
    FindKey -->|Found| CalcUsage["計算消耗<br/>Tokens × Rate"]
    
    CalcUsage --> ValidateOrg2{"驗證<br/>組織狀態"}
    ValidateOrg2 -->|Inactive| SkipDeduction["⚠️ 跳過扣費<br/>記錄審計"]
    ValidateOrg2 -->|Active| DeductCredit["扣除額度<br/>CreditAccount.applyDeduction"]
    
    DeductCredit --> DeductSuccess{"扣費<br/>成功？"}
    DeductSuccess -->|❌ Insufficient| PublishDeployed["發佈<br/>BalanceDepletedEvent"]
    DeductSuccess -->|✅ Success| PublishDeducted["發佈<br/>CreditDeductedEvent"]
    
    PublishDeducted --> EvalAlert["監聽事件<br/>→ 評估告警"]
    PublishDeployed --> EvalAlert
    SkipDeduction --> EvalAlert
    
    EvalAlert --> CheckThreshold{"告警<br/>閾值觸發？"}
    CheckThreshold -->|No| AsyncEnd2([異步完成])
    CheckThreshold -->|Yes| SendNotif["發送告警<br/>Email / Webhook"]
    SendNotif --> AsyncEnd2
    
    style Start fill:#c8e6c9
    style End1 fill:#ffcdd2
    style End2 fill:#ffcdd2
    style End3 fill:#ffcdd2
    style End4 fill:#ffcdd2
    style AsyncEnd1 fill:#ffcdd2
    style AsyncEnd2 fill:#c8e6c9
    style BifrostResp fill:#a5d6a7
    style ReturnResp fill:#a5d6a7
    style AsyncStart fill:#fff9c4
```

### 關鍵節點說明

| 節點 | 類型 | 意義 |
|------|------|------|
| **驗證** | 決策 | API Key 有效性、組織狀態、模組訂閱 |
| **轉發** | 同步 | 到 Bifrost 的代理請求 |
| **投遞** | 異步 | 將扣費任務推入後台隊列 |
| **扣費** | 非同步 | 後台任務中的額度計算與扣除 |
| **告警** | 非同步 | 事件驅動的閾值評估與通知 |

---

## 2. 合約續約審批流程

```mermaid
graph TD
    Start([合約即將到期<br/>7 天提醒]) --> ScanJob["定時任務<br/>每日掃描"]
    
    ScanJob --> FindExpiring["查詢即將過期<br/>的合約"]
    
    FindExpiring --> LoopContracts{" 遍歷<br/>每個合約"}
    
    LoopContracts -->|未處理| CheckReminder{"上次提醒<br/>< 24h？"}
    CheckReminder -->|Yes| Skip["跳過此合約"]
    Skip --> LoopContracts
    
    CheckReminder -->|No| SendEmail["發送郵件提醒<br/>給 Admin"]
    SendEmail --> RecordReminder["記錄提醒時間"]
    RecordReminder --> LoopContracts
    
    LoopContracts -->|全部處理完| End1([掃描結束])
    
    SendEmail -.->|Admin 查收| AdminEmail["收到郵件"]
    
    AdminEmail --> AdminPortal["登錄 Admin Portal<br/>查看合約"]
    
    AdminPortal --> CheckEligible{"檢查續約<br/>條件"}
    
    CheckEligible -->|❌ 不符合| ContactAdmin["❌ 聯絡營銷<br/>進行協商"]
    ContactAdmin --> End2([流程終止])
    
    CheckEligible -->|✅ 符合| ChooseOption["選擇續約選項"]
    
    ChooseOption --> Option{" 選擇<br/>續約方式"}
    
    Option -->|自動續約| AutoRenewal["✅ 激活自動續約<br/>設置下次更新日期"]
    Option -->|手動續約| ManualRenewal["✅ 手動點擊續約"]
    Option -->|協議續約| AgreeRenewal["✅ 洽談特殊條款<br/>後續約"]
    
    AutoRenewal --> UpdateContract["更新合約記錄<br/>新到期日期"]
    ManualRenewal --> UpdateContract
    AgreeRenewal --> UpdateContract
    
    UpdateContract --> PublishEvent["發佈<br/>ContractRenewedEvent"]
    
    PublishEvent --> SendConfirm["發送確認郵件<br/>給 Organization"]
    
    SendConfirm --> UpdateCreditAccount["同步更新<br/>CreditAccount 額度<br/>（如有變更）"]
    
    UpdateCreditAccount --> LogAudit["記錄審計日誌<br/>Who, When, What"]
    
    LogAudit --> End3([續約完成])
    
    style Start fill:#fff9c4
    style AdminEmail fill:#bbdefb
    style Option fill:#f8bbd0
    style AutoRenewal fill:#c8e6c9
    style ManualRenewal fill:#c8e6c9
    style AgreeRenewal fill:#c8e6c9
    style End1 fill:#c8e6c9
    style End2 fill:#ffcdd2
    style End3 fill:#c8e6c9
```

---

## 3. 邀請新成員流程（含邊界情況）

```mermaid
graph TD
    Start([Admin 決定邀請新成員]) --> InputEmail["輸入成員郵箱<br/>選擇角色 Role"]
    
    InputEmail --> ValidateEmail{"驗證<br/>郵箱格式"}
    
    ValidateEmail -->|❌ Invalid| ErrorEmail["❌ 郵箱格式不正確"]
    ErrorEmail --> End1([流程終止])
    
    ValidateEmail -->|✅ Valid| CheckExists{"檢查郵箱<br/>是否已註冊？"}
    
    CheckExists -->|✅ Exist| CheckMember{"該用戶是否<br/>已是成員？"}
    CheckMember -->|Yes| ErrorExists["❌ 用戶已是組織成員"]
    ErrorExists --> End2([流程終止])
    
    CheckMember -->|No| AllowInvite1["✅ 允許邀請<br/>已註冊用戶"]
    
    CheckExists -->|❌ Not Exist| AllowInvite2["✅ 允許邀請<br/>新用戶"]
    
    AllowInvite1 --> GenToken["生成邀請 Token<br/>加密、有效期 30 天"]
    AllowInvite2 --> GenToken
    
    GenToken --> SaveInvite["保存 Invitation<br/>status: pending"]
    
    SaveInvite --> BuildURL["構建邀請連結<br/>https://app.com/invite?token=xxx"]
    
    BuildURL --> RenderEmail["渲染郵件模板<br/>包含邀請連結"]
    
    RenderEmail --> SendEmail["發送郵件<br/>至受邀者"]
    
    SendEmail -->|Success| ConfirmAdmin["✅ 邀請已發送<br/>通知 Admin"]
    SendEmail -->|Failure| RetryQueue["⚠️ 投遞失敗<br/>加入重試隊列"]
    
    RetryQueue --> Retry3Times{"重試<br/>3 次？"}
    Retry3Times -->|Yes| ConfirmAdmin
    Retry3Times -->|No| NotifyAdmin["❌ 郵件投遞失敗<br/>通知 Admin"]
    
    NotifyAdmin --> End3([流程終止])
    ConfirmAdmin --> Wait["⏳ 等待受邀者點擊"]
    
    Wait -.->|Invitee 收到郵件| ClickLink["點擊邀請連結"]
    ClickLink --> CheckToken{"驗證<br/>Token 有效？"}
    
    CheckToken -->|❌ 過期或不存在| ErrorToken["❌ 邀請連結已過期<br/>建議聯絡 Admin"]
    ErrorToken --> End4([流程終止])
    
    CheckToken -->|✅ 有效| CheckUser{"用戶是否<br/>已登錄？"}
    
    CheckUser -->|Yes| DirectAdd["✅ 直接加入組織<br/>無需重新註冊"]
    CheckUser -->|No| RedirectReg["重定向到<br/>註冊頁面"]
    
    RedirectReg --> SignUp["完成新用戶<br/>註冊"]
    
    DirectAdd --> AddMember["將用戶加入組織<br/>role: ${invitedRole}"]
    SignUp --> AddMember
    
    AddMember --> MarkUsed["標記 Invitation<br/>status: completed"]
    
    MarkUsed --> PublishEvent["發佈<br/>MemberInvitedEvent"]
    
    PublishEvent --> SendWelcome["發送歡迎郵件<br/>快速開始指南"]
    
    SendWelcome --> End5([邀請完成])
    
    style Start fill:#c8e6c9
    style ClickLink fill:#bbdefb
    style DirectAdd fill:#a5d6a7
    style SignUp fill:#a5d6a7
    style ErrorEmail fill:#ffcdd2
    style ErrorExists fill:#ffcdd2
    style NotifyAdmin fill:#ffcdd2
    style ErrorToken fill:#ffcdd2
    style End1 fill:#ffcdd2
    style End2 fill:#ffcdd2
    style End3 fill:#ffcdd2
    style End4 fill:#ffcdd2
    style End5 fill:#c8e6c9
```

---

## 4. 告警觸發與通知流程（並行活動）

```mermaid
graph TD
    Start([Bifrost Sync 完成事件]) --> EventPublish["發佈<br/>BifrostSyncCompletedEvent"]
    
    EventPublish --> AlertListener["Alerts Module<br/>監聽事件"]
    
    AlertListener --> GetConfigs["查詢組織的全部<br/>AlertConfig"]
    
    GetConfigs --> LoopConfig{" 遍歷<br/>每個配置"}
    
    LoopConfig -->|配置| EvalType{"評估告警<br/>類型"}
    
    EvalType -->|Balance Low| CheckBalance["檢查<br/>current_balance"]
    EvalType -->|Usage Limit| CheckUsage["檢查<br/>monthly_usage"]
    EvalType -->|Contract Expiring| CheckExpiry["檢查<br/>days_until_expiry"]
    
    CheckBalance --> BalanceComp{"balance<br/>< threshold？"}
    CheckUsage --> UsageComp{"usage<br/>> limit？"}
    CheckExpiry --> ExpiryComp{"days<br/>≤ 7？"}
    
    BalanceComp -->|No| Skip1["不觸發"]
    UsageComp -->|No| Skip2["不觸發"]
    ExpiryComp -->|No| Skip3["不觸發"]
    
    BalanceComp -->|Yes| Triggered1["✅ 告警觸發"]
    UsageComp -->|Yes| Triggered2["✅ 告警觸發"]
    ExpiryComp -->|Yes| Triggered3["✅ 告警觸發"]
    
    Skip1 --> LoopConfig
    Skip2 --> LoopConfig
    Skip3 --> LoopConfig
    
    Triggered1 --> CheckCooldown{"上次觸發<br/>< cooldown？"}
    Triggered2 --> CheckCooldown
    Triggered3 --> CheckCooldown
    
    CheckCooldown -->|Yes| Dedup["⚠️ 去重<br/>跳過此次通知"]
    CheckCooldown -->|No| GetRecipients["獲取接收方<br/>Email / Webhook URL"]
    
    Dedup --> LoopConfig
    
    GetRecipients --> BuildNotif["並行構建通知"]
    
    BuildNotif --> Email["[並行分支]<br/>構建 Email 消息"]
    BuildNotif --> Webhook["[並行分支]<br/>構建 Webhook Payload<br/>+ 簽名"]
    
    Email --> SendEmail["發送 Email<br/>SMTP"]
    Webhook --> SendWebhook["POST Webhook<br/>含簽名驗證"]
    
    SendEmail -->|Success| EmailLog["記錄投遞成功"]
    SendEmail -->|Failed| EmailRetry["加入重試隊列"]
    
    SendWebhook -->|Success| WebhookLog["記錄投遞成功"]
    SendWebhook -->|Failed| WebhookRetry["加入重試隊列"]
    
    EmailLog --> RecordEvent["並行記錄告警事件<br/>timestamp, status"]
    WebhookLog --> RecordEvent
    EmailRetry --> RecordEvent
    WebhookRetry --> RecordEvent
    
    RecordEvent --> UpdateLastTrigger["更新 last_trigger_time"]
    
    UpdateLastTrigger --> LoopConfig
    
    LoopConfig -->|全部完成| End([告警評估完成])
    
    style Start fill:#fff9c4
    style EventPublish fill:#fff9c4
    style Triggered1 fill:#f8bbd0
    style Triggered2 fill:#f8bbd0
    style Triggered3 fill:#f8bbd0
    style Email fill:#bbdefb
    style Webhook fill:#bbdefb
    style SendEmail fill:#a5d6a7
    style SendWebhook fill:#a5d6a7
    style End fill:#c8e6c9
```

---

## 5. 報表生成與投遞流程

```mermaid
graph TD
    Start([定時任務觸發<br/>每月 1 日 09:00]) --> GetOrgs["獲取需要報表<br/>的組織清單"]
    
    GetOrgs --> LoopOrgs{" 遍歷<br/>每個組織"}
    
    LoopOrgs -->|組織| FetchMetrics["從 Dashboard<br/>查詢指標"]
    
    FetchMetrics --> ValidateMetrics{"指標<br/>完整？"}
    
    ValidateMetrics -->|❌ Missing| LogMissing["⚠️ 記錄日誌<br/>數據不完整"]
    LogMissing --> LoopOrgs
    
    ValidateMetrics -->|✅ Complete| AggData["聚合數據<br/>模型分佈、成本、KPI"]
    
    AggData --> GenPDF["生成 PDF<br/>使用模板引擎<br/>Puppeteer"]
    
    GenPDF --> PDFSuccess{"PDF<br/>生成成功？"}
    
    PDFSuccess -->|❌ Error| GenError["❌ 記錄錯誤<br/>稍後重試"]
    GenError --> LoopOrgs
    
    PDFSuccess -->|✅ Success| SavePDF["保存 PDF<br/>至 S3<br/>file_path: s3://bucket/reports/..."]
    
    SavePDF --> PrepareEmail["準備郵件<br/>收集接收方"]
    
    PrepareEmail --> GetRecipients["查詢 Organization<br/>中的 Admin 郵箱"]
    
    GetRecipients --> CheckRecipients{"有效<br/>接收方？"}
    
    CheckRecipients -->|❌ None| LogNoRecip["⚠️ 記錄日誌<br/>無接收方"]
    LogNoRecip --> LoopOrgs
    
    CheckRecipients -->|✅ Found| BuildEmail["構建郵件<br/>主題、內容、附件"]
    
    BuildEmail --> QueueEmail["加入郵件隊列"]
    
    QueueEmail --> RecordReport["記錄 ReportGeneration<br/>status: pending"]
    
    RecordReport --> LoopOrgs
    
    LoopOrgs -->|全部完成| AsyncEmail["[非同步] 投遞郵件"]
    
    AsyncEmail --> SendLoop{" 遍歷<br/>待投遞郵件"}
    
    SendLoop -->|郵件| SendMail["發送郵件<br/>SMTP"]
    
    SendMail -->|Success| MarkSent["更新狀態<br/>status: sent"]
    SendMail -->|Failed| AddRetry["加入重試隊列<br/>重試 5 次"]
    
    MarkSent --> SendLoop
    AddRetry --> SendLoop
    
    SendLoop -->|全部完成| FinalLog["記錄最終狀態<br/>sent_at timestamp"]
    
    FinalLog --> End([報表流程完成])
    
    style Start fill:#fff9c4
    style AggData fill:#bbdefb
    style GenPDF fill:#e1bee7
    style SavePDF fill:#a5d6a7
    style SendMail fill:#a5d6a7
    style MarkSent fill:#c8e6c9
    style End fill:#c8e6c9
```

---

## 6. 活動圖使用指南

### 何時使用活動圖
- ✅ 涉及多個決策點的複雜業務流程
- ✅ 需要展現異常與恢復路徑
- ✅ 涉及並行或異步操作
- ✅ 業務流程梳理與優化

### 如何閱讀
1. **開始點** (`[*]`) — 流程入口
2. **活動節點** (矩形) — 具體操作
3. **決策節點** (菱形) — 條件判斷
4. **分支**（箭頭標籤）— YES/NO 或選項
5. **並行** (平行線) — 多個活動同時執行
6. **結束點** (黑圓 in 白圓) — 流程出口

### 決策最佳實踐

```mermaid
graph TD
    A["執行操作"] --> B{"決策點<br/>檢查條件"}
    
    B -->|✅ Success| C["執行成功分支"]
    B -->|❌ Failure| D["執行失敗分支"]
    B -->|⚠️ Warning| E["執行警告分支<br/>可繼續"]
    
    C --> F["完成"]
    D --> G["錯誤恢復<br/>或終止"]
    E --> F
```

---

## 相關文檔

- [`sequence-diagrams.md`](./sequence-diagrams.md) — 時序圖（展現時間序列）
- [`state-diagrams.md`](./state-diagrams.md) — 狀態圖（展現狀態轉移）
- [`use-case-diagram.md`](./use-case-diagram.md) — 使用案例圖（角色視角）
- [`../knowledge/domain-events.md`](../knowledge/domain-events.md) — 事件驅動設計

# User Story 補足設計 — Draupnir SA 回填

**日期**：2026-04-18
**狀態**：已通過 brainstorming，待 writing-plans 接續
**上下文**：為 Draupnir v1 已實作功能補上以使用者視角撰寫的 User Story 集合，作為新成員 onboarding 的首要閱讀材料。
**相關**：[`docs/draupnir/specs/README.md`](../../draupnir/specs/README.md)、[`AGENTS.md`](../../../AGENTS.md)

---

## 1. 目標與成功條件

### 目標

在現有的「技術設計規格」之外，補上**使用者視角**的 User Story，讓新加入的工程師、PM、客戶成功人員透過閱讀 story 集合，快速建立對 Draupnir 整體系統的心智模型。

### 範圍

- **納入**：Phase 1~6 已實作的 14 個業務模組
  `Alerts / ApiKey / AppApiKey / AppModule / Auth / CliApi / Contract / Credit / Dashboard / DevPortal / Organization / Profile / Reports / SdkApi`
- **不納入**：
  - `Health` 模組（純內部監控，沒有使用者旅程）
  - Phase 7 前端 UI（尚未實作）
  - 未實作的功能
  - 純技術內部邏輯（DI 容器、migrations、value objects helpers 等）

預估產出 **~60~80 則 story**。

### Success criteria

新人在第一週讀完 story 後能回答以下三題：

1. Draupnir 服務的三類使用者（Cloud Admin / Org Manager / Org Member）各自能做什麼？
2. 一把 API Key 從**產生 → 授權 → 使用 → 計費 → 回收**的旅程，每一段是誰觸發的？
3. 遇到一個陌生的 Controller（例：`DashboardController.perKeyCost`），能從 story 集合反查到對應的業務情境？

---

## 2. Story Template

每則 story 統一 Markdown 格式：

```markdown
### US-APIKEY-003 | Manager 指派 Key 給成員

**As** an Org Manager
**I want to** assign one of my org's API keys to a specific member
**so that** the usage under that key is attributed to the member and respects their quota.

**Related**
- Module: `src/Modules/ApiKey`
- Entry: `AssignApiKeyService.execute()` → `src/Modules/ApiKey/Application/Services/AssignApiKeyService.ts`
- Route: `POST /api/organizations/:orgId/api-keys/:keyId/assign`

**Key rules**
- Manager 只能指派自己 org 的 key、且只能指派給同 org 的成員
- 一把 key 同時只能對應一位 member；重派會覆蓋前一個指派
- 指派後 Bifrost 的 virtual key 會跟著 rotate permissions
```

### 欄位規則

| 欄位 | 規則 |
|---|---|
| **ID** | `US-<MODULE>-<NNN>`（例：`US-APIKEY-003`、`US-CREDIT-012`），大寫、3 位流水號 |
| **標題** | `ID \| 一句中文描述`，副標題必須簡潔（≤ 15 字） |
| **As / I want to / so that** | 必填、三段式，**so that 必須寫商業價值**（不寫技術結果） |
| **Related** | 列**單一進入點**（Service method 或 Controller method），**不列**完整呼叫鏈 |
| **Key rules** | **限 2~3 條**，寫商業規則，**不寫**實作細節（例：不寫「`authResult.membership.orgId === targetOrgId`」，寫「只能指派給同 org 成員」） |

### 刻意不納入

- ❌ Given/When/Then（過 QA，onboarding 不需要）
- ❌ Story points / estimation
- ❌ Priority / sprint 標記
- ❌ 自動化測試連結

### 擴充彈性

展開時若某模組（例：Credit）需要多一個欄位（例：「牽涉金額規則」），允許該模組自訂 1 個額外欄位，但**不可超過一個**——避免模板膨脹。

---

## 3. 資料夾結構與頂層索引

### 目錄配置

```
docs/draupnir/specs/
├── user-stories-index.md          ← 新增，頂層索引
├── personas.md                    ← 新增，Actor 人物卡
│
├── 1-authentication/
│   ├── user-stories.md            ← 新增（Auth + Profile）
│   └── identity-design.md（現有）
├── 2-user-organization/
│   ├── user-stories.md            ← 新增（Organization）
│   └── README.md（現有）
├── 3-api-keys/
│   ├── user-stories.md            ← 新增（ApiKey + AppApiKey + AppModule）
│   └── README.md（現有）
├── 4-credit-billing/
│   ├── user-stories.md            ← 新增（Contract + Credit + Dashboard + Reports + Alerts）
│   └── credit-system-design.md（現有）
├── 7-developer-api/               ← 新增分區
│   ├── README.md                  ← 新增
│   └── user-stories.md            ← 新增（SdkApi + CliApi + DevPortal）
│
├── 5-testing-validation/（不加 story）
└── 6-architecture/（不加 story）
```

### 模組對應分區

| 模組 | 放哪 | 理由 |
|---|---|---|
| Auth, Profile | 1-authentication | 現有分區 |
| Organization | 2-user-organization | 現有分區 |
| ApiKey, AppApiKey, AppModule | 3-api-keys | AppModule 與 AppKey 共生 |
| Contract, Credit | 4-credit-billing | 現有分區 |
| Dashboard, Reports, Alerts | 4-credit-billing（併入） | 都是用量/成本視角 |
| SdkApi, CliApi, DevPortal | 7-developer-api（新增） | 面向外部開發者 |
| Health | 不寫 | 純監控、無 user 旅程 |

### 頂層索引 `user-stories-index.md`

三張表，主表按模組，副表按 Actor / Epic：

```markdown
# Draupnir User Stories 索引

## 1. 依模組查找（主表）
| ID | Story | Actor | 模組 | 分區 |
| US-APIKEY-003 | Manager 指派 Key 給成員 | Manager | ApiKey | [3-api-keys](./3-api-keys/user-stories.md#us-apikey-003) |
...

## 2. 依 Actor 查找
| Actor | Story IDs |
| Cloud Admin | US-AUTH-001, US-ORG-002, ... |
| Org Manager | US-APIKEY-003, US-CREDIT-005, ... |
| Org Member | US-APIKEY-007, US-DASHBOARD-001, ... |
| Bifrost Sync Job | US-DASHBOARD-010, ... |
| SDK Client | US-SDK-001, ... |

## 3. 依業務旅程（Epic）查找
| Epic | Story 序列 |
| API Key 生命週期 | US-APIKEY-001 → 003 → 007 → 012 |
| 額度發放到扣款 | US-CONTRACT-001 → CREDIT-002 → DASHBOARD-004 |
| 使用者註冊到打 API | US-AUTH-001 → ORG-001 → APIKEY-001 → SDK-001 |
```

**設計要點**：
- 主表按模組（與資料夾同構），方便雙向對照
- Epic 只在索引出現、不獨立成檔——避免 story 同時屬於多份檔案造成重複維護
- 每則 story 在索引中只出現一次（主表），副表用 ID 引用

---

## 4. Personas（人物卡）

統一放在 `docs/draupnir/specs/personas.md`，5 張卡、每張約半頁。

### 人物卡範本

```markdown
## 👤 Cloud Admin

**是誰**
Draupnir 平台的總管理員（內部運維 / 客戶成功團隊）。全站唯一能跨 org 操作的角色。

**關切的事**
- 平台整體的健康、用量、異常
- 幫客戶組織（org）建立初始合約與額度
- 介入處理客戶投訴 / 手動調降

**不關切**
- 單一 org 內部的 member 分工
- 單把 key 的細節（除非出問題）

**會碰到哪些模組**
Contract, Organization (provisioning), Credit (手動調整), Alerts (全站視角), Dashboard (管理員視圖)

**代表性 Story**
US-CONTRACT-001, US-ORG-001, US-CREDIT-010
```

### 五張 persona 清單

| Actor | 描述 | 代表模組 |
|---|---|---|
| **Cloud Admin** | 平台總管理員 | Contract, Organization, Credit, Alerts |
| **Org Manager** | 客戶組織擁有者，管 key / 額度 / 成員 | ApiKey, Credit, Organization |
| **Org Member** | 最終使用者，拿指派的 key 打 API | ApiKey, Dashboard, SdkApi |
| **Bifrost Sync Job** | Cron 任務，拉 Bifrost logs 寫 `usage_records` | Dashboard, Credit |
| **SDK Client** | 外部程式（CLI / 客戶系統），透過 key 呼叫 AI | SdkApi, CliApi |

### 欄位規則

- **「不關切」**欄位刻意保留——新人最常混淆「這功能該給誰」，講邊界比講功能更有用
- 代表性 story 列 **2~3 則**即可，完整清單去索引查
- 人物卡集中一份、**不散落**到各模組——persona 是跨模組的

---

## 5. Pilot 與滾動展開

採 **Pilot-first** 策略：先做 ApiKey 模組當樣板，審完再展開。

### Stage 0 — Pilot（ApiKey 模組）

**交付物**：
- `docs/draupnir/specs/3-api-keys/user-stories.md` 含 **~8~12 則 story**
  - 涵蓋：create / assign / revoke / update permissions / update budget / list / member 視角 / Bifrost 鏡像失敗路徑
- `docs/draupnir/specs/personas.md` 含**三張主 persona**（Cloud Admin / Org Manager / Org Member）
- `docs/draupnir/specs/user-stories-index.md` 先只含 ApiKey 部分

**Pilot Gate**（進入 Stage 1 前必須確認）：
1. Story 模板要不要改？
2. 顆粒度太粗 / 太細？
3. Coverage map 寫法能接受？

若要調整，**只改 ApiKey 這一份**、定案後再滾出。

### Stage 1 — 主幹五批

按新人第一週 onboarding 順序：

| 批次 | 模組 | 分區 | 預估 story |
|---|---|---|---|
| 1.1 | Auth + Profile | 1-authentication | ~10 |
| 1.2 | Organization | 2-user-organization | ~8 |
| 1.3 | Contract + Credit | 4-credit-billing | ~12 |
| 1.4 | Dashboard + Reports | 4-credit-billing（續） | ~10 |
| 1.5 | Alerts | 4-credit-billing（續） | ~5 |

**同時補**：Stage 1.4 時補上 **Bifrost Sync Job persona 卡**。

### Stage 2 — 外部整合與剩餘

| 批次 | 模組 | 分區 | 預估 |
|---|---|---|---|
| 2.1 | AppApiKey + AppModule | 3-api-keys（續） | ~8 |
| 2.2 | SdkApi + CliApi + DevPortal | 7-developer-api（新增） | ~8 |

**同時補**：Stage 2.2 時補上 **SDK Client persona 卡**。

### 每批 Definition of Done

一批完成的條件（四項全達）：
1. 該批所有 story 寫完、Related 區的代碼路徑均正確
2. `user-stories-index.md` 三張表都更新
3. 該批所需 persona 卡（如有）已補
4. Coverage map 放在該模組 `user-stories.md` 末尾，允許有空白但必須備註

### 時程預期

- **Pilot**：1 次 AI 產出 + 1 次人工審（~30 分鐘）
- **Stage 1**：5 批 × (AI + 審) = 5 回合
- **Stage 2**：2 回合
- **總計**：~8 回合，預計 **1~2 週**完工（取決於審閱節奏）

---

## 6. 覆蓋率驗證與維護

### 6.1 Coverage map

每份 `user-stories.md` 末尾附對照表，基準為該模組的 Controller 方法 + Application Service 入口：

```markdown
## Coverage map
| Service / Controller method | Story ID | 備註 |
|---|---|---|
| AssignApiKeyService.execute | US-APIKEY-003 | |
| RevokeApiKeyService.execute | US-APIKEY-005 | |
| ApiKeyController.listForMember | US-APIKEY-007 | |
| KeyHash.generate | — | 內部 value object helper |
```

**原則**：**允許空白**，但必須有備註說明。新人看到「—」不會困惑，看到漏列才會。

### 6.2 Staleness 警告（每份 user-stories.md 的檔頭）

```markdown
> 本文件對標代碼日期：YYYY-MM-DD（commit `<sha>`）。
> 若你看到的代碼與此文件明顯不一致，請提 issue 或直接 PR 修正。
```

### 6.3 PR checklist（新增一條）

```markdown
- [ ] 若本次新增 Controller / Service 入口，或改變某個 story 的關鍵規則，已更新對應模組的 `user-stories.md`。
```

加到 `.github/PULL_REQUEST_TEMPLATE.md`（若不存在則建立）。

### 6.4 刻意不做

- ❌ 自動化 lint 檢查 story 是否 stale（過度工程、false positive 多）
- ❌ 要求每 PR 都同步 story（會變 compliance 作業，story 變得馬虎）
- ❌ 與 ADR / DESIGN_DECISIONS 合併（story 是 onboarding 視角，ADR 是決策歷史，定位不同）

---

## 7. 已知風險與緩解

| 風險 | 緩解 |
|---|---|
| Pilot 模板訂完、展開發現格式不夠表達 | Stage 0 Gate 專門擋這點；允許每模組加 1 個自訂欄位 |
| ~60~80 則 story，審閱疲勞 | 分 5+2 批，每批 ≤ 12 則，單次審閱 ≤ 30 分鐘 |
| 新人看完 story 仍問「實際代碼在哪」 | Related 區已含檔案路徑；若不足可在 Pilot review 加 commit 範例 |
| 代碼日後重構、story 全面 stale | 6.2 檔頭警告 + 6.3 PR checklist；接受「部分 stale」是可維持狀態 |

---

## 8. Open 決策（無）

所有主要決策於 brainstorming 階段已確認，無待決項。

---

## 9. 下一步

呼叫 `writing-plans` skill 產出實作計畫（Pilot → Stage 1 → Stage 2 的執行步驟、檢查點、具體指令）。

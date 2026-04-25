# Acceptance-First TDD Pattern for Draupnir

**Date**: 2026-04-25  
**Status**: Proposed project pattern  
**Purpose**: 將 DDD acceptance layer 抽象成可重複套用於目前與未來開發的 TDD 泛式，讓快速、AI-assisted、vibe coding 的開發仍能產出可運作且業務語意準確的功能。

**Related design**: [`2026-04-24-ddd-acceptance-testing-design.md`](./2026-04-24-ddd-acceptance-testing-design.md)

---

## 1. 核心泛式：Acceptance Spine TDD

每個功能都先建立一條「驗收脊椎」（acceptance spine）：

```text
業務意圖
→ Given 初始狀態
→ When 使用者或系統執行動作
→ Then 真實系統狀態改變
→ Then 對外 contract 正確
→ Then domain event / side effect 正確
```

這條 spine 是開發時的方向盤。Implementation 可以用 AI 快速生成，但必須被這條可執行規格拉回真實業務結果。

### 一句話原則

> 先寫能代表業務成功的驗收測試，再往內用單元測試驅動規則細節，最後用 API contract 鎖住外部入口。

---

## 2. 標準 TDD 流程

```text
1. 寫 User Story / Job Story
2. 寫 TDD Slice Checklist
3. 先寫 Acceptance Use Case Spec，確認紅
4. 寫 Domain / Application Unit Specs，確認紅
5. 寫最小 implementation
6. 跑 unit specs，轉綠
7. 跑 acceptance spec，轉綠
8. 補或更新 API Contract Spec
9. 視需要補 Playwright E2E（只限 browser-specific flow）
10. Refactor，保持所有測試綠
11. 跑 typecheck / lint / targeted tests / acceptance tests
```

不要先實作再補測試。若需求很小，仍至少先寫 checklist，並選擇最小可證明它的測試層。

---

## 3. TDD Slice Checklist

每個新功能或 bug fix 開始前，先填這份最小規格：

```md
## TDD Slice

Feature:

Primary user story:
As a [role]
I want to [action]
So that [business outcome]

Acceptance spec:
- [ ] Use case spec path:
- [ ] API contract spec path:

Given state:
- [ ]

When action:
- [ ]

Then assertions:
- [ ] HTTP response / public result
- [ ] DB state
- [ ] Domain event
- [ ] External fake observation
- [ ] Permission behavior
- [ ] Validation behavior
- [ ] Time/expiry behavior, if relevant

Unit specs:
- [ ] Domain invariants
- [ ] Application service edge cases
- [ ] Error branches
- [ ] Boundary conditions

Verification commands:
- [ ] bun test <unit spec>
- [ ] bun test <acceptance spec>
- [ ] bun run typecheck
- [ ] bun run lint
```

這份 checklist 是 review 與 implementation 的共同語言。若某項不適用，明確標示 `N/A`，不要默默省略。

---

## 4. 測試分層與責任

| 層級 | 位置 | 責任 | 不負責 |
|------|------|------|--------|
| Domain Unit | `src/Modules/<Module>/__tests__/*.test.ts` | Value Object、Aggregate invariant、Domain Service 純規則 | DI、DB、HTTP |
| Application Unit | `src/Modules/<Module>/__tests__/*.test.ts` | Application Service branch、錯誤、授權、邊界條件 | 真實 route / middleware |
| Acceptance Use Case | `tests/Acceptance/UseCases/<Module>/*.spec.ts` | 真 DI、真 DB、真 events、跨模組業務流程 | UI 細節 |
| API Contract Acceptance | `tests/Acceptance/ApiContract/*.spec.ts` | route、auth middleware、validation、status code、response shape | 深層業務分支 |
| Browser E2E | `e2e/*.e2e.ts` | 需要瀏覽器才能證明的使用者流程 | HTTP-only flow |

### 選層規則

- 規則純粹：寫 Domain Unit。
- Application branch 複雜：寫 Application Unit。
- 使用者故事或跨模組效果：寫 Acceptance Use Case。
- 新增或修改 HTTP endpoint：寫 API Contract。
- 只有瀏覽器能證明：才寫 Playwright E2E。

---

## 5. Acceptance Use Case Spec 規則

Acceptance Use Case 是主要防偏層。它應該接近使用者故事，而不是 class 測試。

### 必須使用真實項目

- 真實 `TestApp.boot()`
- 真實 ServiceProvider / DI wiring
- 真實 repository implementation
- 真實 DB adapter 與 migration path
- 真實 DomainEventDispatcher
- 真實 validation schema
- 真實 application services

### 可以替換的項目

只有專案控制不到的外部邊界可替換為 fake：

- Clock：`TestClock`
- Scheduler：`ManualScheduler`
- Queue：`ManualQueue`
- Mailer：`InMemoryMailer`
- Webhook deliverer：capturing fake
- LLM / gateway client：mock/fake gateway
- Payment / third-party provider：contract fake

### 禁止事項

- 不 mock repository。
- 不 mock 其他 module 的 application service。
- 不 mock authorization logic。
- 不 mock validation。
- 不用 memory adapter 假裝驗 DB correctness。
- 不只斷言 `success: true`；必須斷言真實 state 或 externally observable effect。

---

## 6. API Contract Spec 規則

每個新增或修改的 endpoint 至少覆蓋三類場景：

```text
1. Happy path：正確 auth + 合法 payload → 正確 status / response shape
2. Auth / permission failure：未登入、角色不符、權限不足
3. Validation failure：缺欄位、型別錯、非法 query/path/body
```

建議檔案：

```text
tests/Acceptance/ApiContract/<module>-endpoints.spec.ts
```

Contract spec 不需要重複所有深層業務流程；那些應放在 Use Case Acceptance。它的工作是鎖住外部入口不被改壞。

---

## 7. Mock / Fake Policy

判斷句：

> 如果 bug 會發生在我們自己的 business code 裡，就不要 fake。  
> 如果 bug 會發生在外部服務不可控行為裡，就 fake 成可觀察測試替身。

| 類型 | 是否可 fake | 理由 |
|------|-------------|------|
| Repository | 否 | 必須驗真 DB mapping、query、migration drift |
| Application Service | 否 | 它就是業務行為本身 |
| Domain Event Dispatcher | 否 | 跨模組 flow 需要真實 dispatch |
| Validation schema | 否 | Contract correctness 的一部分 |
| Auth middleware | 否 | Security boundary 必須真實驗證 |
| Clock | 是 | 時間是外部環境，需 deterministic |
| Mailer / Webhook / Gateway | 是 | 外部不可控，但 fake 必須可觀察 |
| Scheduler / Queue runner | 是 | 以 manual fake 控制觸發時機 |

---

## 8. Feature Implementation Template

### 8.1 User story

```md
As a manager
I want to invite a member to my organization
So that the member can access organization resources after accepting the invitation.
```

### 8.2 Acceptance spine

```md
Given:
- manager user exists
- organization exists
- manager belongs to organization

When:
- manager sends invitation to email
- invited user accepts invitation

Then:
- invitation status becomes accepted
- organization_members has the new member
- relevant domain event is emitted
- non-manager cannot invite
- invalid email returns validation error
```

### 8.3 Test placement

```text
src/Modules/Organization/__tests__/InviteMemberService.test.ts
tests/Acceptance/UseCases/Organization/invitation-lifecycle.spec.ts
tests/Acceptance/ApiContract/organization-endpoints.spec.ts
```

---

## 9. Refactor / Cleanup 泛式

Refactor 也要 TDD，但形式略有不同：

```text
1. 先找既有 behavior coverage
2. 若沒有，先補 characterization / acceptance test
3. 執行小步重構
4. 每步跑 targeted tests
5. 保持 public behavior 不變
6. 最後跑 lint / typecheck / relevant acceptance
```

Cleanup 不以覆蓋率數字為主，而以「行為已鎖住」為主。若 refactor 會穿越 module boundary，優先補 acceptance spec。

---

## 10. Bug Fix 泛式

Bug fix 必須先讓 bug 可重現：

```text
1. 寫 failing regression test
2. 確認它因為目標 bug 失敗
3. 修最小 code
4. 確認 regression test 轉綠
5. 補鄰近 edge cases
6. 跑相關 acceptance / contract
```

Regression test 的層級取決於 bug 的來源：

- 規則錯：unit regression。
- wiring / route / middleware 錯：acceptance 或 API contract regression。
- UI interaction 錯：Playwright regression。

---

## 11. Definition of Done

一個功能只有在以下條件滿足時才算完成：

- [ ] TDD Slice checklist 已填寫或可從 PR/plan 清楚還原。
- [ ] 至少一個測試先紅後綠，證明不是事後補假的測試。
- [ ] Domain / Application 規則有相應 unit coverage。
- [ ] 使用者故事主幹有 Acceptance Use Case coverage。
- [ ] 新增或修改 endpoint 有 API Contract coverage。
- [ ] 只有外部不可控邊界被 fake。
- [ ] `bun run typecheck` 通過，或明確記錄既有 unrelated blocker。
- [ ] `bun run lint` 通過，或明確記錄既有 unrelated blocker。
- [ ] Targeted unit / acceptance tests 通過。
- [ ] Refactor 後測試仍綠。

---

## 12. 與 vibe coding 的配合方式

AI-assisted coding 可以快速產生 implementation，但每輪都必須被測試脊椎校正：

```text
Prompt AI 實作前：提供 TDD Slice + failing tests
Prompt AI 修改時：要求只讓指定 tests 轉綠
Prompt AI refactor 時：要求 public behavior 不變，tests 必須保持綠
Review AI output 時：先看 acceptance assertions 是否真的驗 DB/event/side effect
```

不要用「code 看起來合理」作為完成判準。完成判準是可執行規格通過。

---

## 13. Draupnir 命令對應

常用命令：

```bash
# Unit / low-level tests
bun test src/Modules/<Module>/__tests__/<Spec>.test.ts

# Acceptance for one module or spec
bun test tests/Acceptance/UseCases/<Module>/<flow>.spec.ts
bun test tests/Acceptance/ApiContract/<module>-endpoints.spec.ts

# All acceptance tests
bun run test:acceptance

# Static checks
bun run typecheck
bun run lint

# Full project check
bun run check
```

若全量命令因既有 unrelated 問題失敗，最終報告必須明確列出：

- targeted verification 已通過哪些命令
- full verification 被哪個既有問題阻擋
- 該 blocker 是否與本次變更相關

---

## 14. Rollout Rule

從現在起，每個非 trivial 功能、bug fix、refactor 都應選擇以下最小組合：

| 任務類型 | 最小 TDD 組合 |
|----------|---------------|
| Pure domain rule | Domain Unit |
| Application service branch | Application Unit + edge cases |
| New business capability | Acceptance Use Case + Unit |
| New / changed endpoint | API Contract + relevant Unit/Acceptance |
| Cross-module flow | Acceptance Use Case mandatory |
| Browser-only behavior | Playwright E2E + lower-level coverage |
| Bug fix | Failing regression at the layer where bug appears |
| Refactor | Characterization test before behavior-preserving edits |

這個表是未來開發的預設規則；若跳過某層，必須在 plan 或 PR 說明理由。

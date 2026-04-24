# DDD 驗收測試 PR-3（清理 + 文件 + CI）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 PR-1（harness）、PR-2（Credit pilot specs）收尾：刪除已被 Acceptance 層取代的舊 integration 測試，讓 `bun run check` 與 CI workflow 都把 `test:acceptance` 納入必過關卡，並寫下方法論 / 貢獻者指南，讓後續模組（Auth、Organization…）的團隊能照表操課。

**Architecture:**
- 刪除 `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`（被 `tests/Acceptance/UseCases/Credit/deduct-until-depleted.spec.ts` 與 `credit-topped-up-restores-keys.spec.ts` 取代，見 spec §9.1 #6、#7 以及 §11 既有測試處置表）。
- 調整 `package.json`：`test:acceptance` 改為直接輸出到 console（移除目前 `> .omx/logs/test-acceptance.log 2>&1` 重導向，否則 `check` 失敗時看不到失敗訊息）；新增 `check` 內的 `test:acceptance` 鏈結；保留既有 `test:acceptance:watch`。
- 新增 `.github/workflows/ci.yml` 裡的 `acceptance-tests` job — 採獨立 job（非合併進 `unit-coverage`），理由：acceptance 需要寫 SQLite tmp file，單獨 job 才能清楚分離失敗範圍；且可跟 `unit-coverage` 平行跑。
- 新增方法論文件 `docs/draupnir/specs/5-testing-validation/acceptance-layer.md` — 對外說明「為什麼、有哪幾層、如何寫一支新的 spec」，把 PR-1/PR-2 的原則翻譯成日常貢獻者能照做的步驟。
- 更新 `docs/draupnir/specs/5-testing-validation/README.md` 把新文件掛進索引。

**Tech Stack:** Bun runtime（`bun test`）/ GitHub Actions YAML / 既有 `@gravito/atlas` SQLite migrations / 繁體中文 markdown。

---

## 範圍確認（Scope Note）

本計畫實作 spec §13 的 **PR-3**。完整清單（逐字對應 spec）：

1. 刪除 `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`
2. `docs/draupnir/specs/5-testing-validation/acceptance-layer.md`（方法論 + 貢獻者指南）
3. `check` 組合加入 `test:acceptance`
4. CI workflow 更新

**不在 PR-3**：
- 推廣 acceptance 層到 Auth / Organization / Alerts 等模組 — spec §10 後續階段。
- OpenAPI-driven `tests/Feature/*` 與 Playwright `e2e/*` 的去留評估 — spec §11 寫明「3 個月後再評估」，本 PR 不動。
- 其他 Credit `__tests__/*.test.ts` 的去留評估 — spec §11 寫明「pilot 驗收後另評估」，本 PR 不動。

**前置條件**：
- PR-1（`c6f5641`、`9cc821c`、`f38db1d`、`acde12a`、`21fd8cf` 等）已在 master。
- PR-2（`tests/Acceptance/UseCases/Credit/*.spec.ts` + `tests/Acceptance/ApiContract/credit-endpoints.spec.ts` + 對應 helpers）已合併到 master。本 PR 的 Task 1 會驗證此前置條件；若尚未合併則停止。

---

## File Structure

### 要刪除的檔案

| Path | 理由 |
|------|------|
| `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts` | Spec §11：被 pilot #6、#7 完整取代；寫法（手動 `new` service + mock port + 直接用 `DomainEventDispatcher.on`）是反面教材，留著會誤導新貢獻者。 |

### 要修改的檔案

| Path | 修改內容 |
|------|---------|
| `package.json` | 1) `test:acceptance` 移除 `.omx/logs/test-acceptance.log` 重導向；2) `check` 串接 `test:acceptance`。 |
| `.github/workflows/ci.yml` | 新增 `acceptance-tests` job；與 `unit-coverage` 平行；env 填 `BIFROST_API_URL` / `BIFROST_MASTER_KEY` / `JWT_SECRET` 等 placeholder（TestApp 已自帶 default，但 CI 明確指定避免誤用）。 |
| `docs/draupnir/specs/5-testing-validation/README.md` | 在「文檔清單」與「🏗️ 實現狀態」區塊新增 acceptance-layer.md 的條目；狀態標示 ✅ 完成。 |

### 要新增的檔案

| Path | 責任 |
|------|------|
| `docs/draupnir/specs/5-testing-validation/acceptance-layer.md` | 對齊 spec 的對外方法論文件：分層說明、TestApp harness 概覽、DSL 使用指南、加一支新 spec 的 step-by-step 範例、FAQ、與既有測試分層的取捨。 |

---

## Task 1: 驗證前置條件並快照覆蓋

**Files:**
- Read: `tests/Acceptance/UseCases/Credit/deduct-until-depleted.spec.ts`
- Read: `tests/Acceptance/UseCases/Credit/credit-topped-up-restores-keys.spec.ts`
- Read: `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`

**為何：** 在刪除舊測試前先確認 PR-2 的 acceptance specs 已真的蓋到 #6、#7 情境（spec §11 的前提），並執行一次 `bun run test:acceptance` 讓 baseline 綠。這一步沒有程式碼變更，純讀檔 + 執行。

- [ ] **Step 1: 確認 PR-2 的兩支關鍵 spec 檔存在且描述對得上**

Run:
```bash
ls -1 tests/Acceptance/UseCases/Credit/deduct-until-depleted.spec.ts \
      tests/Acceptance/UseCases/Credit/credit-topped-up-restores-keys.spec.ts
```
Expected: 兩個路徑都存在（無 `No such file` 訊息）。

- [ ] **Step 2: 確認場景描述覆蓋「扣光餘額 → 封鎖 key → Gateway rate limit 歸零」與「充值 → 恢復 suspended key」**

Run:
```bash
grep -n "describe\|it(" tests/Acceptance/UseCases/Credit/deduct-until-depleted.spec.ts
grep -n "describe\|it(" tests/Acceptance/UseCases/Credit/credit-topped-up-restores-keys.spec.ts
```
Expected: `deduct-until-depleted.spec.ts` 至少有一個 `it(...)` 提到 depleted / suspend / rate limit；`credit-topped-up-restores-keys.spec.ts` 至少有一個 `it(...)` 提到 reactivate / resume。

**若任一條件不滿足：** 停止本 PR。回報 PR-2 尚未合併或覆蓋不足。不要進行 Task 2。

- [ ] **Step 3: 快照舊整合測試的兩個 it 描述**

Run:
```bash
grep -n "it(" src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts
```
Expected 會出現兩行（參考值 — 以當下檔案為準）：
```
85:  it('扣光餘額 → 自動封鎖 Key → 充值 → 自動恢復 Key', async () => {
143:  it('餘額低於閾值但未耗盡時不應封鎖 Key', async () => {
```

**認定取代關係**（不需額外程式碼，僅為記錄）：
| 舊 `it` | 對應的 Acceptance spec |
|---------|-----------------------|
| `扣光餘額 → 自動封鎖 Key → 充值 → 自動恢復 Key` | `deduct-until-depleted.spec.ts` + `credit-topped-up-restores-keys.spec.ts` |
| `餘額低於閾值但未耗盡時不應封鎖 Key` | `deduct-credit.spec.ts`（spec #4／#5 已在 PR-2 涵蓋，且 domain event 「低於閾值但未耗盡」不 suspend 的行為由 `HandleBalanceDepletedService` 僅註冊 `credit.balance_depleted` event、不註冊 `credit.balance_low` 保證）|

- [ ] **Step 4: Baseline — acceptance 綠、check 綠（記錄既有狀態）**

Run:
```bash
bun run test:acceptance
```
Expected: PASS（所有 Credit pilot specs + smoke + support `__tests__`）。

Run:
```bash
bun run check
```
Expected: PASS（typecheck + lint + test）— **注意** 此時 `check` 尚未包含 `test:acceptance`，這是 PR-3 要加的；這一步只是確認 baseline 綠。

- [ ] **Step 5: 不 commit（本任務純驗證 / 探索）**

---

## Task 2: 刪除 `CreditEventFlow.integration.test.ts`

**Files:**
- Delete: `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`

**為何：** Spec §11 明確列為「刪除」；保留會誤導。

- [ ] **Step 1: 再次確認全專案沒有其他檔案 import 或 reference 此 test**

Run:
```bash
grep -rn "CreditEventFlow.integration" \
  --include="*.ts" --include="*.md" --include="*.json" \
  src tests packages scripts docs \
  2>/dev/null
```
Expected 輸出（或等值）：
```
docs/superpowers/plans/2026-04-24-ddd-acceptance-testing-pr1-harness.md:…
docs/superpowers/plans/2026-04-25-ddd-acceptance-testing-pr2-credit-pilot.md:…
docs/superpowers/specs/2026-04-24-ddd-acceptance-testing-design.md:…
src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts
```
只有三份 plans/specs 與檔案本身提到它即合格。**不要**去改 plans/specs 裡的引用（那是歷史記錄）。

- [ ] **Step 2: 刪除檔案**

Run:
```bash
git rm src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts
```
Expected: `rm 'src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts'`。

- [ ] **Step 3: 跑既有 test runner，確認 Credit 單元測試仍綠**

Run:
```bash
bun test src/Modules/Credit
```
Expected: 其他 Credit `__tests__/*.test.ts`（`CreditAccount.test.ts`、`TopUpCreditService.test.ts`、`DeductCreditService.test.ts`、`HandleBalanceDepletedService.test.ts` …）全部 PASS，且出現的檔案名單**不再包含** `CreditEventFlow.integration.test.ts`。

- [ ] **Step 4: 全量 check 綠**

Run:
```bash
bun run check
```
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git commit -m "test: [credit] 移除被 Acceptance 層取代的 CreditEventFlow integration 測試

Spec §11 處置：#6/#7 場景已由 tests/Acceptance/UseCases/Credit/
deduct-until-depleted.spec.ts 與 credit-topped-up-restores-keys.spec.ts
完整覆蓋（真實 DI wiring + 真實 SQLite + 真實 DomainEventDispatcher）。

舊檔案的手動 new service + mock port 寫法是反面教材，留著會誤導新貢獻者。"
```

---

## Task 3: 調整 `test:acceptance` script，移除輸出重導向

**Files:**
- Modify: `package.json` (line with `"test:acceptance": ...`)

**為何：** 目前 `test:acceptance` 為：
```json
"test:acceptance": "mkdir -p .omx/logs && bun test tests/Acceptance --reporter=dots --coverage-reporter=lcov > .omx/logs/test-acceptance.log 2>&1"
```
把 stdout/stderr 全部重導向到 log file，是 OMX 自動化 loop 的遺留。本 PR 要把 `test:acceptance` 加進 `check`；若保留重導向，CI 或本機 `bun run check` 失敗時**看不到**失敗訊息，只剩一個非 0 exit code，debug 困難。

決策：
- `test:acceptance` 改為直接 emit 到 console（移除 `> ... 2>&1`）。
- 保留 `--reporter=dots` 讓輸出精簡。
- 保留 `--coverage-reporter=lcov` 讓 CI artifact 可上傳 coverage。
- `mkdir -p .omx/logs` 移除（不再寫 log，資料夾不需要）。
- 需要寫 log 的本機自動化場景請自行在 call site 重導向（例如 `bun run test:acceptance > /tmp/out.log 2>&1`），不再由 script 內嵌。

- [ ] **Step 1: 修改 `package.json`**

找到：
```json
    "test:acceptance": "mkdir -p .omx/logs && bun test tests/Acceptance --reporter=dots --coverage-reporter=lcov > .omx/logs/test-acceptance.log 2>&1",
```

替換為：
```json
    "test:acceptance": "bun test tests/Acceptance --reporter=dots --coverage-reporter=lcov",
```

（只改這一行；`test:acceptance:watch` 保持原狀。）

- [ ] **Step 2: 驗證輸出可見**

Run:
```bash
bun run test:acceptance
```
Expected:
- console 直接出現 vitest dot 進度（`.` / `F` / `x` 等）與最終 summary。
- 沒有建立 `.omx/logs/test-acceptance.log`（若先前存在可不用清；這次跑不會新建或覆蓋）。
- 整體 PASS。

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: [scripts] test:acceptance 改為直出 console

加入 check 鏈前的前置改動：移除 .omx/logs 重導向，
讓 bun run check 失敗時能直接看到 acceptance 層的錯誤。
需要寫 log 的自動化場景可在 call site 自行重導向。"
```

---

## Task 4: `check` 組合加入 `test:acceptance`

**Files:**
- Modify: `package.json` (line with `"check": ...`)

**為何：** Spec §12 CI 整合明確：
```json
"check": "bun run typecheck && bun run lint && bun run test && bun run test:acceptance"
```

目前為：
```json
"check": "bun run typecheck && bun run lint && bun run test"
```

接在 `bun run test` **之後**（非之前）的理由：
1. 單元測試最快（ms 級），先跑能快速淘汰明顯壞掉的 diff。
2. Acceptance 會啟真 SQLite + 完整 bootstrap，若 typecheck/單元測試就掛了，acceptance 必然也掛但沒增加資訊。
3. `&&` 短路行為：typecheck/lint/test 任一失敗就不會跑到 acceptance，開發迭代回饋最快。

- [ ] **Step 1: 修改 `package.json`**

找到：
```json
    "check": "bun run typecheck && bun run lint && bun run test",
```

替換為：
```json
    "check": "bun run typecheck && bun run lint && bun run test && bun run test:acceptance",
```

- [ ] **Step 2: 驗證 `check` 串聯正確**

Run:
```bash
bun run check
```
Expected:
- 先跑 typecheck（tsc --noEmit），PASS。
- 再跑 lint（biome lint …），PASS。
- 再跑 test（bun test src tests/Unit packages），PASS。
- 最後跑 test:acceptance，PASS。
- 全程非 0 退出：整體 FAIL；全綠：整體 PASS。

- [ ] **Step 3: 反向驗證短路（可選但建議）**

模擬 lint fail 驗證 `check` 短路行為：

Run:
```bash
# 暫時在任一 src/**/*.ts 加入未使用的 const 觸發 biome lint
```
Expected: `check` 在 lint 步驟就退出，不會跑到 acceptance。還原檔案後重新 `bun run check` 應 PASS。

（若不做此步驟，只要 Step 2 綠即可放行。）

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: [scripts] check 加入 test:acceptance 作為最後一關

Spec §12：驗收層成為主線 check 的必過關卡。
放在 typecheck → lint → test → test:acceptance 末段，
讓較快的關卡先跑，短路失敗時開發迭代回饋最快。"
```

---

## Task 5: 撰寫方法論文件 `acceptance-layer.md`（第一版內容：概覽 + 分層）

**Files:**
- Create: `docs/draupnir/specs/5-testing-validation/acceptance-layer.md`

**為何：** Spec §13 明確 deliverable。本 Task 先寫前半段（為什麼、怎麼分層、TestApp API），Task 6 續寫後半段（step-by-step 寫新 spec、FAQ、檔案地圖）。拆兩個 commit 因為文件較長、分段 review 較容易。

- [ ] **Step 1: 新建檔案並寫入以下內容**

````markdown
# Draupnir 驗收測試層（Acceptance Layer）

> **狀態**：✅ Credit pilot 已完成（2026-04-25）
> **對應設計文件**：[`docs/superpowers/specs/2026-04-24-ddd-acceptance-testing-design.md`](../../../superpowers/specs/2026-04-24-ddd-acceptance-testing-design.md)
> **對應實作 PR**：PR-1（harness + IClock）、PR-2（Credit pilot specs）、PR-3（清理 + 文件 + CI）

---

## 1. 為什麼要有驗收層

單元測試 mock 太多、E2E 太慢，中間缺一層「真實 DI wiring + 真實 SQLite + 真實 DomainEventDispatcher」的切片。驗收層補這個缺口：

| 缺口（改造前） | 驗收層如何填補 |
|---------------|---------------|
| 真實 DI wiring 沒驗：ServiceProvider 綁錯、event handler 沒註冊這類問題單元測試抓不到 | `TestApp.boot()` 走真實 `bootstrap()`，所有 provider register、所有 module boot hook 都真實執行 |
| 測試按 class 組織，無法快速看出「某個 user story 有無覆蓋」 | `tests/Acceptance/UseCases/<Module>/<scenario>.spec.ts` 檔名即場景名 |
| 跨模組 saga 只能靠 E2E | 真實 `DomainEventDispatcher` + 真實 handler 註冊；`app.events[]` 可觀察所有派發事件 |
| Drizzle / SQL 實作 bug 只在 production 浮出 | Per-worker SQLite tmp file + 真實 Atlas migrations |

**非目標**：
- 不取代 Playwright UI E2E（`e2e/*.e2e.ts` 仍保留需瀏覽器的場景）。
- 不取代 Domain 層純邏輯單元測試（Domain aggregate / value object 的 unit test 速度最快、最精準）。
- 不取代 Bifrost gateway 真實 contract 驗證（acceptance 用 `MockGatewayClient`）。

---

## 2. 兩層架構

```
tests/Acceptance/
├── UseCases/                ← 主要戰場（80% 場景）
│   └── <Module>/
│       └── <scenario>.spec.ts
├── ApiContract/             ← 關鍵 API 驗證
│   └── <module>-endpoints.spec.ts
└── support/                 ← harness 與 DSL helpers
    ├── TestApp.ts
    ├── TestClock.ts
    ├── lastResult.ts
    ├── http/                ← app.http / app.auth
    ├── seeds/               ← app.seed（raw DB insert helpers）
    ├── fakes/               ← ManualScheduler / ManualQueue 等
    ├── db/                  ← migrate / truncate / tables
    └── scenarios/           ← scenario(app).given.*.when.*.then.*
```

### 分工表

| 項目 | Use Case Acceptance | API Contract Acceptance |
|------|--------------------|-----------------------|
| 入口 | Application Service method call | In-process HTTP fetch（`app.http.get/post/...`） |
| 描述風格 | Given / When / Then DSL | 樸素 `describe + it` |
| 覆蓋 | Domain + Event + 跨模組 saga + DI wiring | + Routes / Auth middleware / Zod validation / HTTP 語意 |
| 數量 | 多（每 user story 一支） | 少（每 endpoint 3 個關鍵場景：happy / auth 失敗 / validation 失敗） |
| 速度 | 最快（無 HTTP） | 稍慢（同 container、in-process fetch） |

---

## 3. TestApp Harness API

統一位置：`tests/Acceptance/support/TestApp.ts`。

### 3.1 Lifecycle

| 階段 | 建議位置 | 行為 |
|------|---------|------|
| Per worker | vitest 自動（`VITEST_WORKER_ID`） | 建立 `/tmp/draupnir-acceptance/worker-<id>.db`、跑 Atlas migrations |
| Per test file | `beforeAll` | `app = await TestApp.boot()` |
| Per test | `beforeEach` | `await app.reset()` — truncate 所有表 + reset fakes + clear events + reset clock |
| Per test file | `afterAll` | `await app.shutdown()` — 關 core、釋放 SQLite 檔 |

### 3.2 主要欄位

| 欄位 | 型別 | 用途 |
|------|------|------|
| `app.container` | `IContainer` | 真實 DI container；`container.make(ServiceKey)` 取任何 service |
| `app.db` | `IDatabaseAccess` | `container.make('database')` 的 shorthand；支援 `.table('x').where(...).first()` 查詢 |
| `app.clock` | `TestClock` | `setNow(date)` / `advance(ms)`；已在 container rebind 為 `'clock'` |
| `app.gateway` | `MockGatewayClient` | `app.gateway.calls.updateKey[...]` 檢查 call 序列；已在 container rebind 為 `'llmGatewayClient'` |
| `app.scheduler` | `ManualScheduler` | `trigger(name)` 手動觸發排程；不自動跑 cron |
| `app.queue` | `ManualQueue` | 手動拉取 queue 訊息，不真起 Redis |
| `app.events` | `CapturedEvent[]` | 所有經 `DomainEventDispatcher` dispatch 的事件；`app.reset()` 清空 |
| `app.http` | `InProcessHttpClient` | `app.http.get/post/patch/delete(path, { body?, auth?, headers? })`；底層走 `core.fetch(req)` |
| `app.auth` | `TestAuth` | `await app.auth.tokenFor({ userId, role, ... })` 直接簽 JWT；`bearerHeaderFor(...)` 組 header |
| `app.seed` | `TestSeed` | raw-DB 種子：`user / organization / orgMember / creditAccount / apiKey / appModule / moduleSubscription / usageRecord` 8 個方法 |
| `app.lastResult` | `LastResultStore` | when.* 寫入 service result、then.* 讀取 |

### 3.3 外部 Port 的 rebind 規則

`TestApp.boot()` 的 `afterRegister` hook 會把以下 container binding 換成 test fake：

| Container key | 生產實作 | Test fake |
|---------------|---------|-----------|
| `clock` | `SystemClock` | `TestClock`（初始時間 `2026-01-01T00:00:00.000Z`） |
| `llmGatewayClient` | `BifrostGatewayClient` | `MockGatewayClient` |
| `scheduler` | Croner-based | `ManualScheduler` |
| `queue` | Redis Streams-based | `ManualQueue` |

**絕對不 rebind**（spec §6.1）：Domain Repository、其他 Module 的 Application Service、`DomainEventDispatcher`、Zod validation、Drizzle / libsql / SQLite。
````

- [ ] **Step 2: 驗證檔案能被 markdown renderer 解析**

Run:
```bash
test -s docs/draupnir/specs/5-testing-validation/acceptance-layer.md && echo ok
```
Expected: `ok`。

Run:
```bash
head -30 docs/draupnir/specs/5-testing-validation/acceptance-layer.md
```
Expected: 從第一段 `# Draupnir 驗收測試層` 開始，格式正常。

- [ ] **Step 3: Commit（中繼 commit，Task 6 會補後半段）**

```bash
git add docs/draupnir/specs/5-testing-validation/acceptance-layer.md
git commit -m "docs: [acceptance] 新增驗收測試層方法論（概覽 + 兩層 + TestApp API）

spec §13 PR-3 deliverable：方法論 + 貢獻者指南第一部分。
後續 commit 補 step-by-step 貢獻指南、FAQ 與既有測試處置。"
```

---

## Task 6: 方法論文件第二部分：Given-When-Then DSL + 貢獻者 step-by-step + FAQ

**Files:**
- Modify: `docs/draupnir/specs/5-testing-validation/acceptance-layer.md`（append）

**為何：** 讓「我要寫一支新的 acceptance spec」這個日常動作有明確範例可抄。把 PR-2 Credit pilot 的寫法精煉成模板。

- [ ] **Step 1: 在檔案末尾追加以下內容**

````markdown

---

## 4. Given-When-Then DSL（Use Case 層）

### 4.1 基本形狀

```ts
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { TestApp } from '../../support/TestApp'
import { scenario } from '../../support/scenarios'

describe('扣款至餘額耗盡 → 自動封鎖該 Org 所有 active Keys', () => {
  let app: TestApp
  beforeAll(async () => { app = await TestApp.boot() })
  afterAll(async () => { await app.shutdown() })
  beforeEach(async () => { await app.reset() })

  it('餘額 100 扣 100 後 key 被 suspend 且 Gateway rate limit 歸零', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '100' })
      .given.activeApiKey({
        orgId: 'org-1',
        keyId: 'key-1',
        createdByUserId: 'admin-1',
      })

      .when.userDeductsCredit({ orgId: 'org-1', amount: '100' })

      .then.creditBalanceIs('org-1', '0')
      .then.apiKeyIsSuspended('key-1', { reason: 'CREDIT_DEPLETED' })
      .then.gatewayKeyRateLimit('mock_vk_000001', { tokenMaxLimit: 0 })
      .then.domainEventsInclude([{ eventType: 'credit.balance_depleted' }])
      .run()
  })
})
```

### 4.2 三個 namespace 的責任

| Namespace | 語意 | 實作原則 |
|-----------|------|---------|
| `given.*` | 建立前提 state（真實寫 DB） | 呼叫 `app.seed.*` 或直接 insert；不 overwrite，重複呼叫拋錯 |
| `when.*` | 執行被測試的動作 | 從 container 取真實 Application Service，執行後把 result 寫 `app.lastResult` |
| `then.*` | 斷言結果（讀真實 state） | 查 DB 或 captured fakes；失敗時丟帶上下文的 Error |

### 4.3 什麼時候**不**用 DSL

單步驟、純 Application Service 單點驗證直接 `it`：

```ts
it('充值金額為 0 應拒絕', async () => {
  const svc = app.container.make('topUpCreditService') as TopUpCreditService
  const res = await svc.execute({
    orgId: 'org-1',
    amount: '0',
    callerUserId: 'admin-1',
    callerSystemRole: 'admin',
  })
  expect(res.success).toBe(false)
})
```

DSL 只用在「需要說故事」的場景（多步驟、跨模組、有時間順序）。

---

## 5. API Contract Acceptance

每 endpoint 至少三場景：happy / auth 失敗 / validation 失敗。

```ts
describe('POST /api/organizations/:orgId/credits/topup', () => {
  let app: TestApp
  beforeAll(async () => { app = await TestApp.boot() })
  afterAll(async () => { await app.shutdown() })
  beforeEach(async () => { await app.reset() })

  it('admin 充值 → 200 + 更新餘額', async () => {
    await app.seed.user({ id: 'admin-1', role: 'admin' })
    await app.seed.organization({ id: 'org-1' })
    await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })

    const res = await app.http.post('/api/organizations/org-1/credits/topup', {
      body: { amount: '500' },
      auth: await app.auth.tokenFor({ userId: 'admin-1', role: 'admin' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, data: { balance: '500' } })
  })

  it('非 admin 角色 → 403', async () => { /* ... */ })
  it('缺欄位 → 422 + Zod details', async () => { /* ... */ })
})
```

---

## 6. 加一支新 Use Case spec：step-by-step

假設你要為 Auth 模組的「裝置登入成功發出 access token」情境寫 acceptance。

1. **檔名用業務語言**：`tests/Acceptance/UseCases/Auth/device-login-success.spec.ts`。
2. **檢查需要的 given.\*** 若 Auth 場景需要既有使用者 + session，但目前 `scenarios/given/*` 只有 Credit 相關的 helpers，有兩個選擇：
   - 對「能復用給其他模組」的 helper：新增 `scenarios/given/user.ts`（如：`given.user({ id, email, role })`）。
   - 對「只這支 spec 需要」的準備：直接在 `it` 內呼叫 `app.seed.*`，不必走 DSL。
3. **檢查需要的 when.\*** 同上；當行為是真的被測試的主角，務必走 `scenarios/when/<verb>.ts` 包一層（例如 `when.userLogsIn`），把 service resolve + call + lastResult write 封進去。
4. **檢查需要的 then.\*** 同上；多考慮「讀 DB」與「讀 captured event」兩類助手。
5. **寫 spec**：沿用 §4.1 的骨架；`beforeAll`/`afterAll`/`beforeEach` 三件套不可省。
6. **跑 `bun run test:acceptance`**：過了就 commit；沒過先看是 helper 有問題還是 spec 有問題。
7. **如果動了 helper**：順手在 `support/scenarios/__tests__/<namespace>.test.ts` 補一支 helper 自身的 round-trip 測試。

### 檢核清單（PR review 時對照）

- [ ] 檔名是「業務語言」，不是 service class 名。
- [ ] `beforeEach` 有 `app.reset()`。
- [ ] 沒有 `vi.fn()`、沒有 mock domain repository / application service。
- [ ] 跨模組 saga 的 event dispatcher 是「真實」的（讀 `app.events[]`，不是 mock）。
- [ ] 沒有 `vi.useFakeTimers()`（與 real DB / HTTP 衝突）— 要控時間請用 `app.clock`。
- [ ] 檔案沒有整段重複 seed 片段；能抽就抽進 `given.*` 或 `app.seed.*`。

---

## 7. FAQ

### Q1：為什麼用 SQLite 而不是 Postgres？

Per-worker SQLite tmp file 幾乎零啟動成本（毫秒級 migration），CI 不需要額外 service。Postgres 針對 `migration-drift` job 獨立跑；驗收層只要「真實 DB，不是 memory adapter」就達成目的。若將來 schema 用到 Postgres 專屬特性（例：JSONB operator），再考慮切 Postgres。

### Q2：為什麼不用 `vi.useFakeTimers`？

Fake timers 會攔截 `setTimeout` / `Date.now`，與 SQLite driver、Atlas migrator、HTTP handler 之間偶爾有競態。改以**注入式** clock（`IClock`）配 `TestClock`，邊界明確、互相不干擾。

### Q3：spec 數量長期下來會爆炸嗎？

Credit pilot 的經驗：9 支 Use Case spec + 1 支 API Contract spec 共 10 檔、約 40 it，全跑 < 10s。其他模組依循「每個 user story 一檔」的 granularity，每模組預估 5~15 支、整體 50~150 支，仍在 vitest 同時並行的舒適範圍。如果未來突破 30s，再評估：
- 把 happy-path-only 的 API Contract 合成一支。
- 拉 CI 併發 worker 數。
- 把 gateway / clock 重設成本更低。

### Q4：`app.lastResult` 是什麼？為什麼要存？

when.* 助手執行完 Application Service 後拿到 result（例 `TopUpResponse { success, data: { transactionId, balance } }`），then.* 助手常常要讀（例要拿 `transactionId` 比對）。把它集中型別化暫存到 `app.lastResult`，避免每支 helper 都要自己串鏈狀態。Spec 裡偶爾也會 `app.lastResult.expect<MyType>()` 直接讀。

### Q5：舊的 `tests/Feature/*.e2e.ts`（OpenAPI-driven）與 `e2e/*.e2e.ts`（Playwright）還留嗎？

Spec §11 處置：
- `tests/Feature/` — **暫留 3 個月**，之後評估是否用 OpenAPI 自動生成 API Contract spec 吸收。
- `e2e/*.e2e.ts` — 瘦身計畫，HTTP-only 場景逐步移往 API Contract；留在 Playwright 的只剩「需要瀏覽器」的場景。
- `src/**/__tests__/*.test.ts`（Domain 純邏輯）— **全部保留**，速度最快、最精準。

---

## 8. 既有測試對照表

| 分層 | 位置 | 特性 | PR-3 後狀態 |
|------|------|------|-------------|
| 單元測試（Domain / Application 純邏輯） | `src/**/__tests__/*.test.ts` | 用 `MemoryDatabaseAccess`，mock 跨模組依賴 | 保留；Credit 的 pilot 驗收後另評估去留 |
| 整合測試（舊） | `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts` | 手動 new service + mock port | **已刪除**（PR-3 Task 2） |
| Feature 測試 | `tests/Feature/api-*.e2e.ts` | OpenAPI spec-driven | 暫留 3 個月再評估 |
| Acceptance Use Case | `tests/Acceptance/UseCases/<Module>/*.spec.ts` | 真實 DI + SQLite + events + DSL | **主要戰場（新）** |
| Acceptance API Contract | `tests/Acceptance/ApiContract/*.spec.ts` | in-process HTTP + 真實 DI | **新** |
| E2E UI | `e2e/*.e2e.ts`（Playwright） | 完整 build + 瀏覽器 | 保留需瀏覽器的場景 |
| Adapter / Foundation 單元 | `tests/Unit/` | 低階工具 | 保留 |

---

## 9. 推廣路線（參考 spec §10）

| 階段 | 模組 | 重點 | 已完成？ |
|------|------|------|---------|
| Pilot | Credit | 建立 harness + DSL | ✅ PR-1/2/3 |
| 階段 2 | Auth | JWT、device flow、密碼雜湊 | 待排 |
| 階段 3 | Organization | multi-member、invitation 信 | 待排 |
| 階段 4 | ApiKey | Gateway 交互邊界 | 待排 |
| 階段 5 | Alerts | Webhook 外送 | 待排 |
| 階段 6 | Reports | 時間驅動批次任務 | 待排 |

每階段獨立 PR；前後階段不互鎖。

---

**最後更新**：2026-04-25（PR-3 落地）
````

- [ ] **Step 2: 確認檔案可讀且結構完整**

Run:
```bash
grep -cE '^## [1-9]' docs/draupnir/specs/5-testing-validation/acceptance-layer.md
```
Expected: `9`（九個一級章節 1–9；若你在 Task 5 / Task 6 抽換章節編號，數字對應調整即可）。

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: [acceptance] 補齊 DSL 範本、貢獻者 step-by-step、FAQ

spec §13 PR-3 deliverable：把 PR-2 Credit pilot 的寫法精煉成
讓後續模組（Auth / Organization …）能照表操課的範本。"
```

---

## Task 7: 更新 `docs/draupnir/specs/5-testing-validation/README.md` 索引

**Files:**
- Modify: `docs/draupnir/specs/5-testing-validation/README.md`

**為何：** 新文件要出現在索引，否則新貢獻者找不到。

- [ ] **Step 1: 在「📄 文檔清單」末段，`impulse-validation.md` 之後插入新條目**

找到（原檔約 38–76 行區塊，以 `--- ` 分隔）：
```markdown
### [@gravito/impulse FormRequest 驗證整合設計](./impulse-validation.md)
…（原本段落內容）…

---
```

在**該段最後的水平線 `---`** 之後（緊接 `## 🏗️ 實現狀態` 之前）插入：

```markdown
### [驗收測試層（Acceptance Layer）](./acceptance-layer.md)

**目標**：在單元測試與 Playwright E2E 之間建立「真實 DI wiring + 真實 SQLite + 真實 DomainEventDispatcher」的切片，以業務情境組織 spec，覆蓋跨模組 saga 與 DI 綁定。

**核心決策**：
- 分兩層：Use Case（Given-When-Then DSL）+ API Contract（樸素 describe/it）
- Per-worker SQLite tmp file + 真實 Atlas migrations（非 memory adapter）
- 外部 port（clock / gateway / scheduler / queue）可 rebind 為 fakes；Domain / Repository / Event dispatcher 絕對不 mock
- 對應設計文件：[`docs/superpowers/specs/2026-04-24-ddd-acceptance-testing-design.md`](../../../superpowers/specs/2026-04-24-ddd-acceptance-testing-design.md)

**實作 PR**：
- PR-1：harness + `IClock` 基礎建設
- PR-2：Credit pilot（9 支 Use Case + 3 endpoint × 3 場景的 API Contract）
- PR-3：清理舊 integration 測試、方法論文件、`check` 與 CI 整合

**涵蓋範圍**：目前 Credit 模組（pilot）；後續模組見 [`acceptance-layer.md`](./acceptance-layer.md) §9 推廣路線。

---
```

- [ ] **Step 2: 更新「🏗️ 實現狀態」區塊**

找到：
```markdown
### 🟡 API 功能性測試框架 — 待實現

- ⏳ Spec Walker 實現
- ⏳ 自動 Test Case 生成
- ⏳ Flow Runner 實現
- ⏳ CI/CD 整合
```

在其**下方**（即 `**計劃實現**：` 之前）插入：

````markdown
### ✅ 驗收測試層（Acceptance Layer）— 已完成 Credit pilot

- ✅ PR-1：harness（TestApp / TestClock / ManualScheduler / ManualQueue / migrate / truncate / scenario runner 骨架）
- ✅ PR-2：Credit pilot specs（9 支 Use Case + 1 支 API Contract × 3 endpoints × 3 場景）+ DSL helpers
- ✅ PR-3：舊 CreditEventFlow integration 刪除、方法論文件、`bun run check` 串接 `test:acceptance`、CI acceptance job

詳細規範與貢獻者指南 → [`acceptance-layer.md`](./acceptance-layer.md)

**相關目錄**：
```
tests/Acceptance/
├── UseCases/Credit/           # pilot
├── ApiContract/               # pilot
└── support/                   # harness + DSL helpers
```

````

- [ ] **Step 3: 更新檔尾 status 行**

找到檔尾：
```markdown
**狀態**：✅ 表單驗證完成 / 🟡 API 測試框架待實現  
**最後更新**：2026-04-10
```

替換為：
```markdown
**狀態**：✅ 表單驗證完成 / 🟡 API 功能性測試框架待實現 / ✅ 驗收測試層 Credit pilot 完成
**最後更新**：2026-04-25
```

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: [testing-validation] README 索引新增 Acceptance Layer 區塊

把 acceptance-layer.md 接入 docs/draupnir/specs/ 的導覽樹，
避免新貢獻者要從 PR-3 commit message 才找得到。"
```

---

## Task 8: 新增 CI workflow `acceptance-tests` job

**Files:**
- Modify: `.github/workflows/ci.yml`

**為何：** Spec §12「CI workflow（若有）加入 `bun run test:acceptance` 作為必過關卡」。選擇獨立 job（非合進 `unit-coverage`）：
1. 失敗範圍清楚（job 名直接指向哪一層壞）。
2. 可跟 `unit-coverage` 平行。
3. 環境變數與暫存檔路徑清晰（acceptance 需寫 `/tmp/draupnir-acceptance/*.db`）。

- [ ] **Step 1: 在 `.github/workflows/ci.yml` 新增 job**

在 `routes-check` job 之後、`di-audit` job 之前（或檔尾任一合適位置）插入：

```yaml
  acceptance-tests:
    runs-on: ubuntu-latest
    env:
      BIFROST_API_URL: http://localhost:8080
      BIFROST_MASTER_KEY: ci-test-key
      JWT_SECRET: ci-test-secret
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - uses: actions/cache@v4
        with:
          path: |
            ~/.bun/install/cache
            node_modules
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lock', 'bun.lockb') }}
          restore-keys: |
            bun-${{ runner.os }}-
      - run: bun install --frozen-lockfile
      - name: Run acceptance tests
        run: bun run test:acceptance
      - name: Upload acceptance coverage artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: acceptance-coverage-lcov
          path: coverage/
          if-no-files-found: ignore
```

**注意事項**：
- `env` 三個變數放 job-level；`TestApp.boot` 內的 `??=` default 仍會生效，但 CI 顯式設定便於排查。
- 不設 `ORM`：`TestApp.boot` 內部強制 `process.env.ORM = 'atlas'` 並設好 SQLite 路徑，外層不需也不應蓋掉。
- coverage artifact 名刻意與 `unit-coverage` 的 `coverage-lcov` 區分，避免 upload 衝突。
- **不**需要 Postgres service（acceptance 用 SQLite）。
- **不**需要 Playwright browsers。

- [ ] **Step 2: YAML 語法檢查（本機）**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo 'yaml ok'
```
Expected: `yaml ok`。若 Python 3 的 PyYAML 不在：用 `grep -nE '^  [a-z][a-z-]*:$' .github/workflows/ci.yml` 肉眼確認 job key 縮排一致，所有 job 都對齊在 `  ` 兩空白。

- [ ] **Step 3: 確認既有 job 未受影響**

Run:
```bash
grep -cE "^  [a-z][a-z-]*:$" .github/workflows/ci.yml
```
Expected: 比原先多 1。原先 8 個 job（typecheck、lint-format、unit-coverage、migration-drift、routes-check、di-audit、e2e-smoke、commitlint）→ 新增後為 `9`。

- [ ] **Step 4: Commit**

```bash
git commit -m "ci: 新增 acceptance-tests job

spec §13 PR-3：CI 將驗收測試層納入必過關卡。
獨立 job（非合進 unit-coverage），與其他 job 平行跑，
失敗範圍清楚。不依賴 Postgres / Playwright browsers，
只用 SQLite tmp file，啟動成本低。"
```

---

## Task 9: 端到端驗證 — `bun run check` + 模擬 CI 指令

**Files:**
- 無（純驗證）

**為何：** 刪除檔案、改 script、加 CI job 三者彼此相關，最後跑一次端到端驗證確保沒有互撞。

- [ ] **Step 1: 乾淨樹 + 全量 check**

Run:
```bash
git status
```
Expected: `nothing to commit, working tree clean`（前 8 個 Task 的 commit 都已落地）。

Run:
```bash
bun run check
```
Expected:
- typecheck PASS
- lint PASS
- test PASS（不應看到 `CreditEventFlow.integration.test.ts` 在執行清單裡）
- test:acceptance PASS（看到 vitest dot 進度與最終 summary）
- 整體 exit 0

- [ ] **Step 2: 模擬 CI acceptance job**

Run:
```bash
BIFROST_API_URL=http://localhost:8080 \
BIFROST_MASTER_KEY=ci-test-key \
JWT_SECRET=ci-test-secret \
bun run test:acceptance
```
Expected: PASS。

- [ ] **Step 3: 手動驗證刪除的檔案沒有被任何 `bun test` 行為撿到**

Run:
```bash
bun test src 2>&1 | grep -c "CreditEventFlow.integration"
```
Expected: `0`。

- [ ] **Step 4: 清理 acceptance DB 殘留（避免下一次 smoke 被舊 schema 絆到）**

Run:
```bash
rm -f /tmp/draupnir-acceptance/*.db /tmp/draupnir-acceptance/*.db-journal /tmp/draupnir-acceptance/*.db-shm /tmp/draupnir-acceptance/*.db-wal
```
Expected: 無 error（即使路徑不存在也是 `rm -f` 靜默成功）。

- [ ] **Step 5: 不 commit；本任務純驗證。若前面任何 Task 有漏，回頭補 commit。**

---

## Task 10: 開 PR + 撰寫說明

**Files:**
- 無（git / GH 操作）

- [ ] **Step 1: 切分支並推遠端**

若仍在 master：
```bash
git checkout -b feat/ddd-acceptance-pr3-cleanup-docs-ci
git push -u origin feat/ddd-acceptance-pr3-cleanup-docs-ci
```

若已在 feature branch（例如透過 worktree 操作）：
```bash
git push -u origin HEAD
```

- [ ] **Step 2: 用 `gh pr create` 開 PR**

```bash
gh pr create --title "test: [ddd-acceptance] PR-3 清理 + 文件 + CI" --body "$(cat <<'EOF'
## 摘要

Spec §13 PR-3 收尾：

- 刪除 `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`（被 `tests/Acceptance/UseCases/Credit/deduct-until-depleted.spec.ts` 與 `credit-topped-up-restores-keys.spec.ts` 取代；舊寫法是反面教材）
- `package.json`：`test:acceptance` 移除輸出重導向（否則 `check` 失敗看不到訊息），`check` 鏈末端加入 `test:acceptance`
- 新增 `docs/draupnir/specs/5-testing-validation/acceptance-layer.md`（方法論 + 貢獻者 step-by-step + FAQ）
- 更新 `docs/draupnir/specs/5-testing-validation/README.md` 索引
- `.github/workflows/ci.yml` 新增 `acceptance-tests` job（獨立、與 `unit-coverage` 平行）

## 對應設計與前序 PR

- 設計文件：[`docs/superpowers/specs/2026-04-24-ddd-acceptance-testing-design.md`](../blob/master/docs/superpowers/specs/2026-04-24-ddd-acceptance-testing-design.md)
- PR-1：harness + IClock
- PR-2：Credit pilot specs

## 驗證

- [x] `bun run check`（包含新加入的 test:acceptance）全綠
- [x] `bun test src` 不再列出 `CreditEventFlow.integration.test.ts`
- [x] 本機模擬 CI env：\`BIFROST_API_URL / BIFROST_MASTER_KEY / JWT_SECRET\` 指定後 \`test:acceptance\` PASS
- [ ] GitHub Actions 所有 job 綠（push 後觀察）

## 對後續模組的影響

方法論文件已列推廣路線（Auth → Organization → ApiKey → Alerts → Reports）。
每階段獨立 PR；acceptance-layer.md §6 提供 step-by-step 範本可直接照抄。
EOF
)"
```

- [ ] **Step 3: 觀察 CI，所有 job 必須綠；失敗時按 job 名定位回去修對應 Task**

Run:
```bash
gh pr checks
```
Expected: 所有 check 最終狀態為 `pass`（特別關注新加的 `acceptance-tests`）。

- [ ] **Step 4: 等待 review，merge 後本 PR 完結**

---

## Self-Review 檢核

**1. Spec 覆蓋（§13 PR-3）**：
- 刪除 `CreditEventFlow.integration.test.ts` → Task 2 ✅
- `docs/draupnir/specs/5-testing-validation/acceptance-layer.md` → Task 5 + Task 6 ✅
- `check` 組合加入 `test:acceptance` → Task 4 ✅
- CI workflow 更新 → Task 8 ✅

附加（支撐主 deliverable）：
- Task 1（前置驗證） — 確保刪檔安全。
- Task 3（`test:acceptance` 移除重導向） — Task 4 的前置，否則 check 失敗訊息丟失。
- Task 7（index README） — 確保新文件可被找到。
- Task 9（端到端驗證） — 4 個改動彼此交互的最終保險。
- Task 10（PR 建立） — 交付路徑。

**2. Placeholder 掃描**：無 TBD / TODO / 「implement later」；每個 step 都有實際內容或 exact command。

**3. Type / path 一致性**：
- 要刪的檔名 `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts` — Task 1、Task 2、Task 9、Task 10 拼寫一致。
- 要建立的文件 `docs/draupnir/specs/5-testing-validation/acceptance-layer.md` — Task 5、Task 6、Task 7 拼寫一致。
- `test:acceptance` script 名稱 — Task 3、Task 4、Task 8、Task 9 拼寫一致。
- `acceptance-tests` CI job 名稱 — Task 8、Task 9、Task 10 拼寫一致。

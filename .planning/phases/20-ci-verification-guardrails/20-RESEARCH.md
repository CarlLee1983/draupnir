# Phase 20: CI Verification Guardrails - Research

**Researched:** 2026-04-13
**Domain:** CI/CD (GitHub Actions) + Bun toolchain 守門機制
**Confidence:** HIGH

## Summary

本 phase 將現有單一 `check` CI job 擴充為 7 + 1 並行 jobs，串接既有工具（typecheck / Biome / Bun test / routes-analyzer）並新增 3 個基建腳本（`scripts/di-audit.ts`、`scripts/migration-drift.ts`、commitlint 設定）與 runbook（`docs/ci/branch-protection-setup.md`）。所有關鍵決策已於 `20-CONTEXT.md` 鎖定，研究僅驗證技術可行性與社群最佳實踐。

技術棧以 Bun 1.x 原生能力為主（`bunfig.toml [test].coverageThreshold`、Bun.cron、`oven-sh/setup-bun@v2`），Postgres 以 GitHub Actions `services.postgres` container 提供（標準 `--health-cmd pg_isready` 模式），commitlint 採 `@commitlint/cli` + `@commitlint/config-conventional`（CONTEXT.md 明示的唯一允許新增依賴例外）。E2E 透過既有 `playwright.config.ts` 的 `webServer` 自動啟動應用，baseURL `http://localhost:3001`。

**Primary recommendation:** 7 jobs 並行、共用 `actions/cache` 快取 `~/.bun/install/cache` 與 `node_modules`；`e2e-smoke` 與 `migration-drift` 共用同一 postgres service container 定義（copy-paste 而非 reusable workflow，此 phase 不引入額外抽象）；commitlint 單獨一個 job 使用 `actions/checkout` with `fetch-depth: 0` + `--from base.sha --to head.sha`。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-Coverage:**
- **D-01:** 使用 Bun 原生 `coverageThreshold`（`bunfig.toml` `[test]` 區塊），不自寫解析腳本
- **D-02:** 全域 80% 門檻（不做分層 per-module threshold）
- **D-03:** 未達標時 CI job 直接 fail

**D-Migration:**
- **D-04:** 策略 = apply-then-dump：CI 啟乾淨 Postgres、跑完全部 Orbit migrations、dump schema 與 Drizzle schema 推導結果比對
- **D-05:** Postgres 以 GitHub Actions `services.postgres` container 提供（不用 docker-compose）
- **D-06:** Drift 時 fail job 並輸出 diff 摘要（tables / columns 不一致）
- **D-07:** 腳本入口：`scripts/migration-drift.ts` + `bun run migration:drift`

**D-DI:**
- **D-08:** 策略 = runtime boot-and-resolve smoke：啟動 container、resolve 所有已註冊 token
- **D-09:** 腳本入口：`scripts/di-audit.ts` + `bun run di:audit`
- **D-10:** 覆蓋所有已註冊 token（不以 controller 使用反推）

**D-E2E:**
- **D-11:** 3 條 smoke journeys：Admin portal 登入+建立 Org / Member portal 登入+API keys / CLI device flow
- **D-12:** PDF report 延後
- **D-13:** E2E job 使用 Postgres service container + `tests/Feature/lib/admin-seed.ts` 模式

**D-CI:**
- **D-14:** 7 並行 jobs（typecheck / lint-format / unit-coverage / migration-drift / routes-check / di-audit / e2e-smoke）
- **D-15:** `actions/cache` 快取 `~/.bun/install/cache` 與 `node_modules`
- **D-16:** 沿用既有觸發條件（push main/develop + PR → main/develop）

**D-Commit:**
- **D-17:** `@commitlint/cli` + `@commitlint/config-conventional`（允許的新增依賴例外）
- **D-18:** PR 內所有 commits（`--from base.sha --to head.sha`）
- **D-19:** Type 集合：`feat/fix/docs/style/refactor/perf/test/chore`
- **D-20:** 允許繁體中文 commit subject

**D-Branch:**
- **D-21:** 僅交付文件，不自動設定 GitHub branch protection
- **D-22:** Runbook：`docs/ci/branch-protection-setup.md`，附 `gh api` 指令範例

### Claude's Discretion
- Workflow YAML 具體 job 名稱命名（建議 kebab-case）
- Coverage reporter 格式（text summary + lcov artifact）
- Playwright base URL 與 app startup 細節
- `scripts/di-audit.ts` 錯誤輸出格式（建議分類：missing / circular / factory-failed）
- Migration drift diff 格式（建議表格 table/column/expected/actual）
- commitlint config 檔位置與 scope 規則細節

### Deferred Ideas (OUT OF SCOPE)
- PDF report E2E smoke
- Coverage 分層門檻（domain/app/infra）
- Branch protection 自動化腳本
- Migration drift allow-list
- Performance / load testing CI gate
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CI-01 | Playwright E2E smoke（admin/member portal、CLI device flow，PDF 延後） | 既有 `playwright.config.ts` + `e2e/*.e2e.ts` 4 檔已存在；本 phase 挑選 3 條為 smoke、其餘保留為 full E2E |
| CI-02 | Auto TS typecheck 阻擋型別錯誤合併 | 既有 `bun run typecheck` = `tsc --noEmit`，CI 已有 step，僅需拆為獨立 job |
| CI-03 | 測試覆蓋率 80% 驗證 | Bun 原生 `bunfig.toml [test].coverageThreshold = 0.8` + `bun test --coverage` |
| CI-04 | Biome lint + format 於 CI | 既有 `bun run lint` / `bun run format:check`，拆為獨立 job |
| CI-05 | Commit history 驗證 | commitlint `--from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }}` |
| CI-06 | DB migration schema drift（SQL migrations vs Drizzle schema） | 新增 `scripts/migration-drift.ts`：apply-then-dump 與 `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` 比對 |
| CI-07 | Routes invariance | 既有 `scripts/routes-analyzer.ts` + `tests/Feature/routes-existence.e2e.ts`（⚠️ 檔名已是 `.e2e.ts` 不是 `.test.ts`；CONTEXT.md 有誤需更正） |
| CI-08 | DI binding 完整性稽核 | 新增 `scripts/di-audit.ts`：boot `@gravito/core` IContainer、迭代 resolve 所有註冊 token |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **語言政策**：繁體中文為預設；commit subject / PR description / docs 均繁中（D-20 已允許）
- **GSD workflow**：本 phase 本身透過 GSD commands 驅動，不得繞過
- **Commit format**：`<type>: [<scope>] <subject>`（AGENTS.md 與 `~/.claude/CLAUDE.md` 一致）—— commitlint config-conventional 只驗 type，不強制 scope 括號格式，**需 custom rule 或僅採用 conventional 寬鬆驗證**
- **No new deps**（AGENTS.md 一般性約束） — CONTEXT.md D-17 明示 commitlint 為此 phase 例外；除此之外本 phase 不應引入新依賴
- **Immutability** — 本 phase 為純基建，不影響
- **Bun 為主執行器** — 所有腳本 `bun scripts/*.ts`，避免引入 node

## Standard Stack

### Core
| 工具 | 版本 | 用途 | 為什麼是標準選擇 |
|------|------|------|------------------|
| Bun | 1.x（CI `latest`） | Runtime、test runner、package manager | 專案已全面採用 |
| `oven-sh/setup-bun@v2` | v2 | 官方 GitHub Action | 官方維護；取代 v1 |
| `@commitlint/cli` | ^19（新增） | Commit message 驗證 | 業界標準（Angular / Nx / Nest 均用） |
| `@commitlint/config-conventional` | ^19（新增） | Conventional commits rule set | 與 `~/.claude/CLAUDE.md` type 集合一致 |
| `actions/checkout@v4` | v4 | Checkout + `fetch-depth: 0` for commitlint | 既有 CI 已用 v4 |
| `actions/cache@v4` | v4 | 快取 `~/.bun/install/cache` 與 `node_modules` | D-15 指定 |
| GitHub Actions `services.postgres` | `postgres:16`（建議） | Migration drift + E2E 用 DB | D-05 指定；官方 pattern |

### Supporting
| 工具 | 版本 | 用途 | 使用情境 |
|------|------|------|----------|
| `@biomejs/biome` | ^2.4.11（既有） | lint + format | lint-format job |
| Playwright | ^1.59.1（既有） | E2E smoke | e2e-smoke job，重用 `e2e/*.e2e.ts` |
| drizzle-kit | ^0.31.9（既有） | Drizzle schema introspect / push | migration-drift job 工具之一 |
| Orbit CLI（`bun orbit`） | 既有 | Migration 執行器 | migration-drift job 先執行 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| commitlint | 自寫 regex | CONTEXT.md D-17 拒絕（維護成本） |
| `services.postgres` | docker-compose up | D-05 拒絕（多一層抽象、CI 啟動慢） |
| 單一 monolith job | 7 parallel jobs | D-14 指定（失敗分類清晰） |
| Reusable workflow（`.github/workflows/_setup.yml`） | 每個 job copy-paste 3 行 setup | 本 phase 暫不抽象，待 job 數量穩定後再評估 |

**Installation:**
```bash
bun add -d @commitlint/cli @commitlint/config-conventional
```

**Version verification (MUST run at plan/implement time):**
```bash
npm view @commitlint/cli version
npm view @commitlint/config-conventional version
```
訓練資料版本可能過期，實作時以 registry 最新 stable 為準。

## Architecture Patterns

### Recommended Layout
```
.github/
  workflows/
    ci.yml                      # 擴充：7 並行 jobs + commitlint job
scripts/
  di-audit.ts                   # 新增 — DI boot-and-resolve smoke
  migration-drift.ts            # 新增 — apply-then-dump diff
  routes-analyzer.ts            # 既有 — CI 直接呼叫
  verify-architecture.ts        # 既有 — 可作 di-audit 參考
commitlint.config.cjs           # 新增（CJS 以避免 ESM 載入困擾）
docs/ci/
  branch-protection-setup.md    # 新增 — gh api 範例 runbook
bunfig.toml                     # 新增 — [test].coverageThreshold = 0.8
```

### Pattern 1: GitHub Actions Job with Postgres Service
```yaml
migration-drift:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: draupnir_ci
      ports: ['5432:5432']
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
      with: { bun-version: latest }
    - uses: actions/cache@v4
      with:
        path: |
          ~/.bun/install/cache
          node_modules
        key: bun-${{ hashFiles('bun.lockb', 'bun.lock') }}
    - run: bun install --frozen-lockfile
    - run: bun run migrate
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/draupnir_ci
    - run: bun run migration:drift
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/draupnir_ci
```
Source: https://docs.github.com/actions/guides/creating-postgresql-service-containers

### Pattern 2: commitlint on PR
```yaml
commitlint:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - uses: actions/checkout@v4
      with: { fetch-depth: 0 }
    - uses: oven-sh/setup-bun@v2
    - run: bun install --frozen-lockfile
    - run: |
        bunx commitlint \
          --from ${{ github.event.pull_request.base.sha }} \
          --to   ${{ github.event.pull_request.head.sha }} \
          --verbose
```
Source: https://commitlint.js.org/guides/ci-setup.html

### Pattern 3: DI Boot-and-Resolve Smoke (scripts/di-audit.ts)
基於 `@gravito/core` IContainer API（與 `AuthServiceProvider.ts` 所見 `container.singleton()` / `container.bind()` 一致）：

```typescript
// scripts/di-audit.ts（概念骨架）
import { bootstrap } from '../src/bootstrap'

const { container } = await bootstrap({ skipHttp: true, skipJobs: true })

const tokens = container.listBindings?.() ?? []   // 若 core 未曝露，改用 container internals
const results: Array<{ token: string; ok: boolean; error?: string; category?: string }> = []

for (const token of tokens) {
  try {
    const instance = container.make(token)
    if (instance == null) throw new Error('resolved to null/undefined')
    results.push({ token, ok: true })
  } catch (err) {
    const msg = (err as Error).message
    const category =
      msg.includes('circular') ? 'circular'
      : msg.includes('not bound') || msg.includes('unknown') ? 'missing'
      : 'factory-failed'
    results.push({ token, ok: false, error: msg, category })
  }
}

const failures = results.filter(r => !r.ok)
if (failures.length > 0) {
  console.error('\n❌ DI audit failures:')
  const grouped = Object.groupBy(failures, r => r.category!)
  for (const [cat, items] of Object.entries(grouped)) {
    console.error(`  ${cat}: ${items!.length}`)
    for (const item of items!) console.error(`    - ${item.token}: ${item.error}`)
  }
  process.exit(1)
}
console.log(`✅ DI audit passed — ${results.length} bindings resolvable`)
```

**關鍵開放問題**：`@gravito/core` `IContainer` 是否曝露 `listBindings()`？需實作時先探查；若未曝露，plan 內先加 spike task 以 core repo 或 type definitions 確認 API。

### Pattern 4: Migration Schema Drift (scripts/migration-drift.ts)
```typescript
// 策略：apply-then-dump vs Drizzle schema
// 1. 連已跑完 migrations 的 DB → introspect 實際 schema（用 drizzle-kit introspect 或 raw SQL）
// 2. 載入 src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts 推導期望 schema
// 3. diff：tables × columns × types × nullable × indexes
// 4. diff 非空 → 印表格 + exit 1
```
**關鍵開放問題**：`drizzle-kit introspect` 可直接產生 schema snapshot（JSON），與 `drizzle-kit generate` 的 journal 對比；此為較穩定的 diff 來源。需實作時 spike 確認輸出格式。

### Anti-Patterns to Avoid
- **自寫 coverage threshold parser**：D-01 明示拒絕；若 Bun 原生行為不足（見下方 pitfall），升級 Bun 版本或接受限制
- **Reusable workflow / composite action**：此 phase 先 inline；過早抽象會拖慢 phase 交付
- **在 `bun install` 前執行 cache restore 而未驗證 lockfile hash**：cache key 必須含 `hashFiles('bun.lock*')` 否則 stale
- **將所有 env vars 塞進 workflow YAML**：敏感值用 `secrets.*`；本 phase CI 用 dummy values（既有 `JWT_SECRET: ci-test-secret` pattern）
- **E2E 與 migration-drift 共用同一 DB instance**：各 job 獨立 service container，避免交叉污染

## Don't Hand-Roll

| 問題 | 不要自建 | 改用 | 理由 |
|------|----------|------|------|
| Commit message 驗證 | 自寫 regex | `@commitlint/cli` | D-17；regex 遇中文 subject / multi-line body 會踩坑 |
| Coverage threshold check | Python / shell 解析 lcov | Bun `coverageThreshold` | D-01；但注意 Bun per-file 行為（pitfall 1） |
| Postgres CI 啟動 | docker-compose up + wait-for.sh | `services.postgres` + `--health-cmd pg_isready` | 官方 pattern、GitHub Actions 原生等待 |
| Schema diff 實作 | 自寫 SQL 查 information_schema 再比對 | `drizzle-kit introspect` 輸出 snapshot | Drizzle 已有（免費）工具，避免重造 |
| Routes 抓取 | 自寫 AST parser | 既有 `scripts/routes-analyzer.ts` + `tests/Feature/routes-existence.e2e.ts` | 既存工具已驗證 |
| DI 靜態分析 | AST 掃 `container.bind()` call-site | Runtime boot-and-resolve | D-08；factory bindings 靜態分析會漏 |

**Key insight:** 本 phase 的「新工具」只有 3 個（di-audit / migration-drift / commitlint config + runbook），其餘全部是「把既有工具串進 CI YAML」。保持這個邊界清晰，避免 scope creep。

## Common Pitfalls

### Pitfall 1: Bun coverageThreshold Per-File Behavior
**What goes wrong:** Bun 的 `coverageThreshold` 在部分版本會對**每個檔案**獨立檢查，而非 aggregate。單一邊緣檔案 < 80% 即 fail，且 log 無明確原因（只顯示 coverage 表格 + exit 1）。
**Why it happens:** 上游 Bun issue #7367 / #17028 持續追蹤（截至搜尋時）。
**How to avoid:**
- 實作時先 spike：在 CI 跑一次 `bun test --coverage` 觀察 Bun 實際版本行為
- 若 per-file 行為造成誤報，備案為：`coverageReporter = ["text", "lcov"]` 匯出 lcov 後用輕量腳本（< 30 行）驗 aggregate（CONTEXT.md D-01 禁止「解析腳本」，但只是備案，plan 階段需明確取得確認）
- 升級 Bun 至 latest 通常緩解
**Warning signs:** CI unit-coverage job 在 100% 本地覆蓋率下仍 fail

### Pitfall 2: Orbit CLI 配置 auto-discovery（已知 blocker）
**What goes wrong:** STATE.md 明示「`bun orbit` CLI has configuration auto-discovery issues in some environments; manual script required」
**How to avoid:** migration-drift job 使用 explicit config flag 或沿用現有 manual migration script（需實作時探查專案內替代方案）
**Warning signs:** CI log 出現 "orbit config not found"

### Pitfall 3: commitlint `--from` SHA 在 force-push / rebase PR 的邊界
**What goes wrong:** Force-push 後 `base.sha` 仍指向原 base，但若 PR 被 rebase 過 target branch，commit 範圍可能漏驗或多驗
**How to avoid:** 使用 `github.event.pull_request.base.sha` 而非 `github.base_ref` 的 HEAD；docs 明示以 PR 事件觸發（不要 push 時也驗）
**Warning signs:** commitlint 抱怨不存在的 commit

### Pitfall 4: GitHub Actions `services.postgres` 在 container job vs runner job 的網路差異
**What goes wrong:** 若 job 本身跑在 container 內（`container:` key），service 以名稱 `postgres` 存取；若 job 跑在 runner 上（本 phase 預設），service 暴露在 `localhost:5432`。兩者不可混用。
**How to avoid:** 本 phase 所有 job 跑在 `ubuntu-latest` runner（不使用 `container:`），統一用 `postgres://postgres:postgres@localhost:5432/...`
**Warning signs:** `ECONNREFUSED` on `postgres:5432`

### Pitfall 5: `e2e-smoke` vs 既有 `e2e/*.e2e.ts` 執行時間失控
**What goes wrong:** `playwright.config.ts` 的 `webServer.command` 會觸發 `bun run build:frontend` + 全量 server boot，CI 啟動 > 60s；3 條 smoke 加起來若未限 concurrency 與 timeout，job 易逼近 10min
**How to avoid:**
- `test:e2e:smoke` 腳本明確 `playwright test --grep @smoke` 配合 tag
- smoke journey 內避免任意 `waitForTimeout`
- `webServer.reuseExistingServer: !process.env.CI`（既有已設 `false`，可保留）
**Warning signs:** e2e-smoke job > 10min

### Pitfall 6: Routes test 檔名誤植
**What goes wrong:** 舊文檔曾寫 `routes-existence.test.ts`；Bun 對不含 `.test.` 的檔名需 `bun test ./tests/Feature/routes-existence.e2e.ts` 並設定 `API_BASE_URL`（或透過 `test-feature.ts`）。
**How to avoid:** 以 `docs/README_ROUTES_VERIFICATION.md` 與 `.github/workflows/ci.yml` `routes-check` 為準；plan 內只引用 `*.e2e.ts`。
**Warning signs:** `file not found` in routes-check job

### Pitfall 7: Prism 命名混淆
**What goes wrong:** CONTEXT.md 稱「Prism container」但 `@gravito/prism` 實為 view/template 引擎；DI 容器是 `@gravito/core` 的 `IContainer`
**How to avoid:** Plan 與 `scripts/di-audit.ts` 明確使用 `@gravito/core` 術語；勿 import `@gravito/prism`

## Code Examples

### Bun coverage threshold（bunfig.toml）
```toml
# Source: https://bun.com/guides/test/coverage-threshold
[test]
coverage = true
coverageThreshold = 0.8
coverageReporter = ["text", "lcov"]
coverageDir = "coverage"
coverageSkipTestFiles = true
```

### commitlint.config.cjs
```javascript
// Source: https://commitlint.js.org/reference/configuration.html
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'build', 'revert']
    ],
    'subject-case': [0],    // 關閉：允許中文 subject（D-20）
    'header-max-length': [2, 'always', 100],
  },
}
```

### `gh api` Branch Protection Runbook Snippet (docs/ci/branch-protection-setup.md)
```bash
# 為 main 設定 required checks
gh api -X PUT \
  repos/:owner/:repo/branches/main/protection \
  -F required_status_checks.strict=true \
  -F required_status_checks.contexts[]=typecheck \
  -F required_status_checks.contexts[]=lint-format \
  -F required_status_checks.contexts[]=unit-coverage \
  -F required_status_checks.contexts[]=migration-drift \
  -F required_status_checks.contexts[]=routes-check \
  -F required_status_checks.contexts[]=di-audit \
  -F required_status_checks.contexts[]=e2e-smoke \
  -F required_status_checks.contexts[]=commitlint \
  -F enforce_admins=true \
  -F required_pull_request_reviews.required_approving_review_count=1
# develop 同步驟，branch=develop
```

## State of the Art

| 舊做法 | 目前做法 | 何時改變 | 影響 |
|--------|----------|----------|------|
| `setup-bun@v1` | `oven-sh/setup-bun@v2` | 2025 | 專案既有 `ci.yml` 已用 v2 |
| 自寫 regex 驗 commit | commitlint + config-conventional | 2023+ | 業界標準 |
| docker-compose up postgres | `services.postgres` | GitHub Actions 2021+ | 官方建議 |
| Bun test 無 threshold | `coverageThreshold` | Bun 1.1+ | 見 pitfall 1 |

**Deprecated/outdated:**
- `setup-bun@v1`（專案已脫離）
- 自行抓 `git log --format=%s` 再 regex（commitlint 取代）

## Open Questions

1. **`@gravito/core` `IContainer` 是否曝露 `listBindings()` / token 迭代 API？**
   - 已知：`container.bind()` / `container.singleton()` / `container.make(token)` 存在（見 `AuthServiceProvider.ts`）
   - 不明：是否可枚舉所有 bindings
   - 建議：Plan 20-01 加 spike task（30 分鐘內確認）；若無，以 ServiceProvider registry 反推 token 清單

2. **Orbit CLI 在 CI 的 config auto-discovery 是否解決？**
   - STATE.md 已列為 blocker
   - 建議：migration-drift job 提供 `ORBIT_CONFIG_PATH` env var 或沿用專案內 manual migration script（需 spike）

3. **Bun 版本對 `coverageThreshold` 行為的實際影響（per-file vs aggregate）**
   - 建議：Plan 20-01 包含「CI dry-run」task，實測 `latest` 版本行為；文件化結論

4. **既有 `e2e/*.e2e.ts` 檔是否已區分 smoke vs full？**
   - 檔案已存在：`admin-dashboard.e2e.ts` / `admin-portal.e2e.ts` / `cli-device-flow.e2e.ts` / `member-portal.e2e.ts`
   - 不明：Playwright test `@smoke` tag 覆蓋狀況
   - 建議：Plan 20-01 明列 smoke tag 補強 task

5. **`tests/Feature/routes-existence.e2e.ts` 的執行方式**
   - 檔名 `.e2e.ts` 暗示 Playwright，但位置在 `tests/Feature/` 而非 `e2e/`
   - 建議：實作前先 `bun test tests/Feature/routes-existence.e2e.ts` 本地試跑確認 runner

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun runtime | 所有 jobs | ✓（CI 透過 `setup-bun@v2`） | latest | — |
| PostgreSQL 16 | migration-drift / e2e-smoke | ✓（`services.postgres`） | 16 | 降版至 15 |
| Playwright browsers | e2e-smoke | ✓（`playwright install`） | ^1.59 | — |
| `@gravito/core` container introspection | di-audit | ❓ 未驗證 | — | ServiceProvider-based token 反推 |
| `drizzle-kit introspect` | migration-drift | ✓（devDep ^0.31.9） | 0.31.9 | 自寫 information_schema 查詢 |
| `@commitlint/cli` | commitlint job | ✗（尚未安裝） | — | — |
| GitHub Actions runner | 所有 jobs | ✓ | ubuntu-latest | — |

**Missing dependencies with no fallback:**
- `@commitlint/cli` + `@commitlint/config-conventional` — plan 首 task 需 `bun add -d`

**Missing dependencies with fallback:**
- `@gravito/core` container introspection API — 若無，改用 ServiceProvider registry 反推

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test（unit/integration）+ Playwright ^1.59（E2E） |
| Config file | `bunfig.toml`（新增）+ 既有 `playwright.config.ts` |
| Quick run command | `bun test src tests/Unit packages` |
| Full suite command | `bun run verify && bun test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CI-01 | 3 條 E2E smoke（admin/member/CLI）在 CI 通過 | e2e smoke | `playwright test --grep @smoke` | ✅（tag 待補 Wave 0） |
| CI-02 | Typecheck job 在型別錯誤時 fail | CI integration | `bun run typecheck` | ✅ |
| CI-03 | Unit test coverage < 80% 時 fail | CI integration | `bun test --coverage`（via bunfig.toml threshold） | ❌ Wave 0（bunfig.toml 不存在） |
| CI-04 | Biome lint/format 錯誤時 fail | CI integration | `bun run lint && bun run format:check` | ✅ |
| CI-05 | 非 conventional commit 在 PR 被 block | CI integration | `bunx commitlint --from BASE --to HEAD` | ❌ Wave 0（config 待建） |
| CI-06 | Migrations 後 schema 與 Drizzle schema 不一致時 fail | CI integration | `bun run migration:drift` | ❌ Wave 0（script 待建） |
| CI-07 | Routes 新增/刪除但未更新測試時 fail | feature/e2e | `bun test tests/Feature/routes-existence.e2e.ts` | ✅ |
| CI-08 | 任一 DI binding 無法 resolve 時 fail | smoke | `bun run di:audit` | ❌ Wave 0（script 待建） |

**此 phase 本身是守門基建，「driver test」= CI workflow 實際能在 PR 上觸發並 pass/fail。建議以「開 dummy PR 觸發 workflow」作為 phase gate verification。**

### Sampling Rate
- **Per task commit:** `bun run typecheck && bun run lint`（< 30s）
- **Per wave merge:** `bun run verify`（typecheck + lint + unit + coverage）
- **Phase gate:** 推 branch 觸發 CI，7 jobs 全綠；再於一個空 PR 驗 commitlint job

### Wave 0 Gaps
- [ ] `bunfig.toml` — `[test].coverageThreshold = 0.8`（CI-03 需要）
- [ ] `commitlint.config.cjs` — CI-05 config
- [ ] `scripts/di-audit.ts` + `bun run di:audit` — CI-08
- [ ] `scripts/migration-drift.ts` + `bun run migration:drift` — CI-06
- [ ] `e2e/*.e2e.ts` 的 `@smoke` tag 補強 — CI-01
- [ ] `docs/ci/branch-protection-setup.md` runbook — D-22
- [ ] `bun add -d @commitlint/cli @commitlint/config-conventional` — D-17
- [ ] Spike：`@gravito/core` IContainer token 枚舉 API（影響 di-audit 實作路徑）
- [ ] Spike：Bun `coverageThreshold` 在 CI runner 的實際行為（per-file vs aggregate）
- [ ] Spike：Orbit CLI 在 CI container 的 config path 處理

## Sources

### Primary (HIGH confidence)
- Bun test configuration — https://bun.com/docs/test/configuration
- Bun coverage threshold guide — https://bun.com/guides/test/coverage-threshold
- GitHub Docs — Creating PostgreSQL service containers — https://docs.github.com/actions/guides/creating-postgresql-service-containers
- commitlint CI Setup Guide — https://commitlint.js.org/guides/ci-setup.html
- 專案 `package.json` / `ci.yml` / `playwright.config.ts` / `AGENTS.md` / `CLAUDE.md`
- `.planning/REQUIREMENTS.md` §v1.4 CI-01~CI-08

### Secondary (MEDIUM confidence)
- wagoid/commitlint-github-action README — https://github.com/wagoid/commitlint-github-action
- DEV.to — Bun's Coverage Threshold 分析（2026）— https://dev.to/wkusnierczyk/buns-coverage-threshold-5gkj

### Tertiary (LOW confidence — flag for validation)
- Bun per-file threshold 行為（基於 GitHub issue 討論）— https://github.com/oven-sh/bun/issues/7367 / #17028
- `drizzle-kit introspect` 作為 schema snapshot 來源（需 plan 階段實測）

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — CONTEXT.md 已鎖定決策，僅驗證可行性
- Architecture: HIGH — GitHub Actions / Bun / commitlint 均官方 pattern
- Pitfalls: MEDIUM — 3 個 pitfall（Bun coverage per-file、Orbit config、gravito-core introspection）需實作時 spike 確認
- Open Questions: MEDIUM — 5 個開放點有明確 spike 路徑

**Research date:** 2026-04-13
**Valid until:** 2026-05-13（30 天；Bun / commitlint 為相對穩定工具）

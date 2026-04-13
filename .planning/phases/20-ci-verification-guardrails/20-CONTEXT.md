# Phase 20: CI Verification Guardrails - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

將 7 大守門點串入 GitHub Actions CI pipeline，使每個 PR 必須通過所有檢查才能合併至 `main` / `develop`：

1. Typecheck（`bun run typecheck`）
2. Lint + Format（Biome）
3. Unit + Coverage（Bun test，強制 80% 全域門檻）
4. Migration schema drift（Orbit migrations vs Drizzle schema）
5. Routes invariance（`scripts/routes-analyzer.ts` + `tests/Feature/routes-existence.test.ts`）
6. DI binding 完整性（Prism container boot-and-resolve smoke）
7. E2E smoke（Playwright：Admin portal、Member portal、CLI device flow）
8. Commit message 驗證（commitlint，CI-05）

此 phase 交付**工具 + workflow YAML + 文件**，不包含「修復目前未過門檻的既有問題」與「GitHub branch protection 的實際設定」（僅出 runbook 供 repo admin 執行）。

</domain>

<decisions>
## Implementation Decisions

### D-Coverage: Coverage Threshold
- **D-01:** 使用 Bun 原生 `coverageThreshold`（`bunfig.toml` `[test]` 區塊），不自寫解析腳本
- **D-02:** 全域 80% 門檻（不做分層 per-module threshold，此 phase 不引入額外複雜度）
- **D-03:** 未達標時 CI job 直接 fail（required check），阻擋 PR 合併

### D-Migration: Schema Drift 檢查
- **D-04:** 策略 = apply-then-dump：CI 啟一個乾淨 Postgres、跑完全部 Orbit migrations、dump 實際 schema，與 Drizzle schema 推導結果比對
- **D-05:** Postgres 以 GitHub Actions `services.postgres` container 提供（不使用 docker-compose）
- **D-06:** Drift 發生時直接 fail job 並在 log 輸出 diff 摘要（哪些 tables / columns 不一致），方便開發者補 migration
- **D-07:** 腳本入口：`scripts/migration-drift.ts` + `bun run migration:drift`

### D-DI: DI Binding 完整性稽核
- **D-08:** 策略 = runtime boot-and-resolve smoke：啟動 Prism container、對所有已註冊 token 執行 resolve 一次，抓 missing binding / circular / factory runtime error
- **D-09:** 腳本入口：`scripts/di-audit.ts` + `bun run di:audit`（本地也可跑）
- **D-10:** 覆蓋範圍 = 所有在 Prism container 註冊的 token（不以 controller 使用反推，確保未被引用的 binding 也不能壞）

### D-E2E: Smoke Journey 範圍
- **D-11:** 納入 smoke 的 critical journeys（3 條）：
  1. Admin portal 登入 + 建立 Organization
  2. Member portal 登入 + 查看自己的 API keys / usage
  3. CLI device flow 登入 + 呼叫 API happy path
- **D-12:** **PDF report 產生延後**（不在此 phase smoke 範圍），理由：PDF 生成較重且 flaky 風險高，先建立穩定 smoke baseline
- **D-13:** E2E job 亦使用 Postgres service container；test data 透過既有 `tests/Feature/lib/admin-seed.ts` 模式 seed

### D-CI: GitHub Actions Workflow 結構
- **D-14:** 7 個 jobs 並行（不合併 jobs），每個 job 對應單一守門點；失敗時一眼看出類別
  - `typecheck` / `lint-format` / `unit-coverage` / `migration-drift` / `routes-check` / `di-audit` / `e2e-smoke`
- **D-15:** Cache 策略：`actions/cache` 快取 `~/.bun/install/cache` 與 `node_modules`（避免 7 jobs × `bun install` 膨脹時間）
- **D-16:** 沿用既有 workflow 觸發條件：`push` 到 main/develop + `pull_request` 指向 main/develop

### D-Commit: Commit Message 驗證（CI-05）
- **D-17:** 使用 `@commitlint/cli` + `@commitlint/config-conventional`（此為 phase 20 允許的新增依賴例外，因 CI-05 需要 commit history 驗證，自寫 regex 維護成本高）
- **D-18:** 驗證範圍：PR 內所有 commits（commitlint 支援 `--from` `--to` 或 PR base...head）
- **D-19:** Type 集合沿用專案 CLAUDE.md 既有規範：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore`
- **D-20:** 允許繁體中文 commit subject（專案語言政策）

### D-Branch: Branch Protection 配置
- **D-21:** Phase 20 **僅交付文件**（docs + gh CLI 指令範例），不自動設定 GitHub branch protection
- **D-22:** 產出 runbook：`docs/ci/branch-protection-setup.md`，列出所有 7 jobs 名稱應被設為 required checks，並附 `gh api repos/...` 指令範例供 repo admin 執行

### Claude's Discretion
- Workflow YAML 具體 job 名稱命名慣例（建議符合 kebab-case）
- Coverage reporter 格式（text summary + lcov artifact 都可）
- Playwright base URL 與 app startup 細節
- `scripts/di-audit.ts` 的錯誤輸出格式（建議分類列出 missing / circular / factory-failed）
- Migration drift diff 呈現格式（建議表格列 table/column/expected/actual）
- commitlint config 檔位置與 scope 規則細節

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求與 Roadmap
- `.planning/REQUIREMENTS.md` §v1.4 Requirements — CI-01~CI-08 完整需求條文
- `.planning/ROADMAP.md` §Phase 20 — phase 目標與 plan 拆分
- `AGENTS.md` — 專案 GSD workflow 規範
- `CLAUDE.md` — 專案語言政策與 commit 格式規範

### Codebase 基線
- `.planning/codebase/TESTING.md` — 現有測試框架（Bun + Vitest + Playwright）、coverage 80% 期望、test layout
- `.planning/codebase/STACK.md` — 技術棧與工具版本
- `.planning/codebase/CONVENTIONS.md` — 命名 / 模組結構慣例

### 既有工具與腳本
- `scripts/routes-analyzer.ts` — Routes 分析工具（CI-07 直接串接）
- `tests/Feature/routes-existence.test.ts` — Routes invariance 既有測試
- `scripts/verify-architecture.ts` — 既有架構驗證腳本（可作為 di-audit 設計參考）
- `scripts/check-banned-imports.sh` — 現有守門工具慣用法參考
- `.github/workflows/ci.yml` — 當前 CI workflow（本 phase 將擴充）
- `package.json` §scripts — 既有 `typecheck` / `lint` / `format:check` / `test` / `verify` / `migrate*` 指令
- `database/migrations/` — Orbit migrations 來源
- `playwright.config.ts` — 既有 Playwright 設定

### Routes 驗證方法論
- `~/.claude/projects/-Users-carl-Dev-CMG-Draupnir/memory/routes-verification-methodology.md` — 可復用的 routes 驗證方法論（CI-07 實作參考）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`bun run verify`**：已組合 typecheck + lint + test，CI 可直接沿用部分 job
- **`scripts/routes-analyzer.ts` + `tests/Feature/routes-existence.test.ts`**：CI-07 只需在 CI 中 `bun test tests/Feature/routes-existence.test.ts` + 跑 analyzer
- **`tests/Feature/lib/admin-seed.ts`**：E2E seed data 基礎
- **Prism container**（`app/Foundation/Infrastructure/Prism/`）：di-audit 腳本的目標
- **Orbit CLI**（`bun orbit migrate*`）：migration 執行器
- **Drizzle schema 檔**：drift 比對的另一端

### Established Patterns
- **Scripts 位置**：`scripts/*.ts`（TypeScript）或 `scripts/*.sh`（Bash）——新增 `di-audit.ts` / `migration-drift.ts` 符合慣例
- **NPM scripts 命名**：`<domain>:<action>`（如 `test:watch`、`migrate:rollback`）——建議新增 `di:audit`、`migration:drift`
- **Test layout**：Feature tests 在 `tests/Feature/`；E2E 在 `playwright/tests/`
- **Immutability / DDD**：本 phase 為純基建，不碰 domain code

### Integration Points
- `.github/workflows/ci.yml`：從單一 `check` job 擴充為 7 並行 jobs
- `bunfig.toml`：新增或更新 `[test]` coverageThreshold 設定
- `package.json` `scripts`：新增 `di:audit`、`migration:drift`、`commitlint`（或 `lint:commits`）
- 新增 `commitlint.config.cjs` 或 `.commitlintrc.json`
- 新增 `docs/ci/branch-protection-setup.md` runbook

</code_context>

<specifics>
## Specific Ideas

- Coverage 採用 Bun 原生機制而非額外工具——減少維護面
- DI audit 堅持用 runtime 而非靜態 AST——理由：Prism 支援 factory bindings，靜態分析會漏；真 boot + resolve 最貼近生產啟動行為
- CI 7 jobs 並行而非合併——失敗分類清晰、CI 時間透明，cache 可抵銷 install 成本
- E2E smoke 先排除 PDF 生成——追求穩定優先於覆蓋度
- Branch protection 僅產文件——避免 phase 工作受限於 repo admin token 授權

</specifics>

<deferred>
## Deferred Ideas

- **PDF report E2E smoke**：等 smoke baseline 穩定後另行加入（建議 v1.5 或後續 phase）
- **Coverage 分層門檻（domain 100% / app 80% / infra 70%）**：若全域 80% 不足以反映關鍵模組品質，未來再擴充
- **Branch protection 自動化腳本**：若未來頻繁新增守門 jobs，可考慮 `scripts/ci-bootstrap.sh` 自動設定
- **Migration drift allow-list**：目前採嚴格 fail，若特殊 legacy column 需暫時豁免再引入
- **Performance / load testing CI gate**：本 phase out of scope

</deferred>

---

*Phase: 20-ci-verification-guardrails*
*Context gathered: 2026-04-13*

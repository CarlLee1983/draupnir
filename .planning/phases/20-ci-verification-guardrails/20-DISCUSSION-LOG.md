# Phase 20: CI Verification Guardrails - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 20-ci-verification-guardrails
**Areas discussed:** Coverage threshold 機制、Migration schema drift 策略、DI binding 稽核方法、E2E smoke 範圍 + CI job 結構

---

## Coverage Threshold 機制

### Q1: Coverage 強制機制用哪種？

| Option | Description | Selected |
|--------|-------------|----------|
| Bun 原生 coverageThreshold | bunfig.toml [test] 設 threshold，bun test --coverage 不達標自動 exit non-zero | ✓ |
| 自寫解析腳本 | 解析 coverage 輸出自行判定 | |
| 不硬性門檻，僅產 report | 只產 coverage report 上傳 artifact | |

**User's choice:** Bun 原生 coverageThreshold
**Notes:** 最簡潔、無額外維護成本，符合「不新增依賴」原則

### Q2: Threshold 粒度？

| Option | Description | Selected |
|--------|-------------|----------|
| 全域 80% | 符合 REQUIREMENTS CI-03 和 TESTING.md 既有個設，單一門檻簡單 | ✓ |
| 分層機標（domain 100% / app 80% / infra 70%）| 符合 TESTING.md §Coverage Focus Areas，但 CI 實作較複雜 | |
| 全域 + critical 檔案個別門檻 | 全域 80% 加上指定 domain aggregates 必須 100% | |

**User's choice:** 全域 80%

### Q3: Coverage 未達標時 CI 行為？

| Option | Description | Selected |
|--------|-------------|----------|
| 直接 fail required check | 未達門檻 = PR 無法合併，符合 Phase 20 防回歸目標 | ✓ |
| 警告不阻擋（warning only）| 輸出警告但 job 仍 pass | |
| Soft-fail 過渡期 | 先 continue-on-error，待達門檻再翻硬性 | |

**User's choice:** 直接 fail required check

---

## Migration Schema Drift 策略

### Q1: Drift 比對的內容來源？

| Option | Description | Selected |
|--------|-------------|----------|
| Apply migrations → dump actual schema → 比對 Drizzle schema | 最準確：以 migrations 實際結果為準，抓得到遺漏 | ✓ |
| 解析 SQL migrations DDL → 比對 Drizzle schema | 不需真 DB，純文本比對；快但對複雜 DDL 語意理解不完整 | |
| orbit 內建 diff / doctor 指令 | 專用工具最簡潔，需先確認 orbit 是否已有 drift-check | |

**User's choice:** Apply-then-dump

### Q2: CI 如何提供 Postgres？

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions services: postgres container | 標準做法，job YAML 內直接 services.postgres | ✓ |
| Docker compose 啟動 | 若已有 compose 檔可復用 | |
| 純離線比對（無需 DB）| 對應上一問第二選項 | |

**User's choice:** GitHub Actions services: postgres container

### Q3: Drift 發生時 CI 行為？

| Option | Description | Selected |
|--------|-------------|----------|
| 直接 fail + 輸出 diff 摘要 | PR 無法合併，輸出哪些 tables/columns 不一致 | ✓ |
| 允許 allow-list | 可在 config 指定忽略項；績低但可能被濫用 | |
| 警告不阻擋 | 不 fail、只提醒 | |

**User's choice:** 直接 fail + diff 摘要

---

## DI Binding 稽核方法

### Q1: DI binding 完整性稽核的核心策略？

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime boot-and-resolve smoke | 啟動 Prism container，對所有 token resolve；抓 circular/missing/factory error | ✓ |
| 靜態 AST 掃描 | 分析 container 註冊 + 建構子參數 token；快但會漏 dynamic/factory binding | |
| 約定式檢查 | 每個 I*Xxx port 必須有對應 adapter；最簡單但會放過註冊錯誤 | |

**User's choice:** Runtime boot-and-resolve smoke

### Q2: 稽核腳本位置與觸發？

| Option | Description | Selected |
|--------|-------------|----------|
| scripts/di-audit.ts + bun run di:audit | 新增腳本與 npm script，CI 與本地皆可跑 | ✓ |
| 整合進 tests/Feature/ 作為 Bun test | 以標準 feature test 形式執行 | |
| 直接嵌在 boot sequence | app 啟動時自檢，CI 看 startup 是否成功 | |

**User's choice:** scripts/di-audit.ts + bun run di:audit

### Q3: 覆蓋範圍？

| Option | Description | Selected |
|--------|-------------|----------|
| 所有在 Prism container 註冊的 token | 全量 resolve，最具防護力 | ✓ |
| 僅 Controller/Service 實際用到的 | 從入口逆推 | |
| 依 modules 往下遞迴（全模組 boot）| 啟動所有 ServiceProvider | |

**User's choice:** 所有在 Prism container 註冊的 token

---

## E2E Smoke 範圍 + CI Job 結構

### Q1: E2E smoke 要覆蓋哪些 critical journey？（multi-select）

| Option | Description | Selected |
|--------|-------------|----------|
| Admin portal 登入 + 建立 Organization | 管理端核心 | ✓ |
| Member portal 登入 + 查看 API keys / usage | 成員端核心 | ✓ |
| CLI device flow 登入 | CLI 取得 token + 呼叫 API happy path | ✓ |
| PDF report 產生 | Automated Reports phase 成果 | |

**User's choice:** Admin / Member / CLI（不含 PDF）
**Notes:** PDF 延後避免引入不穩定性

### Q2: CI job 拆分結構？

| Option | Description | Selected |
|--------|-------------|----------|
| 7 jobs 並行 | 每個守門點獨立 job，失敗分類清晰 | ✓ |
| 3 jobs 簇組（static / backend / e2e）| runner 時間少但失敗定位難 | |
| 單一 check job 串行 | 最簡單但 CI 時間最長 | |

**User's choice:** 7 jobs 並行

### Q3: CI-05 commit history 驗證用哪種？

| Option | Description | Selected |
|--------|-------------|----------|
| @commitlint/cli + conventional config | 通用生態現成，支援 feat/fix/... type | ✓ |
| 自訂 regex 腳本 | 無新增 dep，需自行維護規則 | |
| 僅 PR title 驗證 | 只檢 PR title | |

**User's choice:** @commitlint/cli + config-conventional
**Notes:** CI-05 需 commit history 驗證，自寫 regex 維護成本高，值得為此新增 dev dep 例外

### Q4: Branch protection 配置在 phase 範圍內嗎？

| Option | Description | Selected |
|--------|-------------|----------|
| 僅產文件（docs + gh CLI 指令範例）| 交由 repo admin 手動設定 | ✓ |
| gh CLI 腳本自動設定 | 需 admin token，phase 複雜度增加 | |
| Out of scope，擋到未來 phase | Phase 20 只交付 jobs | |

**User's choice:** 僅產文件 runbook

---

## Claude's Discretion

以下項目 downstream agent（planner / researcher）可自行決定：
- Workflow YAML 具體 job 名稱慣例
- Coverage reporter 格式（text summary + lcov artifact）
- Playwright base URL 與 app startup 細節
- DI audit 錯誤輸出格式
- Migration drift diff 呈現格式
- commitlint config 檔位置與 scope 規則細節

## Deferred Ideas

- PDF report E2E smoke（等 smoke baseline 穩定後再加）
- Coverage 分層門檻
- Branch protection 自動化腳本
- Migration drift allow-list 機制
- Performance / load testing CI gate

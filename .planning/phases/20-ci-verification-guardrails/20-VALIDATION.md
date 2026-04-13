---
phase: 20
slug: ci-verification-guardrails
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test（unit/integration）+ Playwright ^1.59（E2E） |
| **Config file** | `bunfig.toml`（Wave 0 建立）+ 既有 `playwright.config.ts` |
| **Quick run command** | `bun run typecheck && bun run lint` |
| **Full suite command** | `bun run verify && bun test:e2e` |
| **Estimated runtime** | ~90 秒（quick）/ ~6 分鐘（full suite，含 E2E smoke） |

---

## Sampling Rate

- **After every task commit:** Run `bun run typecheck && bun run lint`
- **After every plan wave:** Run `bun run verify`（typecheck + lint + unit + coverage threshold）
- **Before `/gsd:verify-work`:** Full suite must be green，並實際推送 branch 觸發 GitHub Actions CI，所有 7 個 jobs 全綠
- **Max feedback latency:** 90 秒（quick）

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 0 | CI-03 | config | `bun test --coverage`（含 threshold） | ❌ W0（bunfig.toml） | ⬜ pending |
| 20-01-02 | 01 | 0 | CI-05 | config | `bunx commitlint --from HEAD~1 --to HEAD` | ❌ W0（commitlint.config.cjs） | ⬜ pending |
| 20-01-03 | 01 | 1 | CI-06 | script | `bun run migration:drift` | ❌ W0（scripts/migration-drift.ts） | ⬜ pending |
| 20-01-04 | 01 | 1 | CI-08 | script | `bun run di:audit` | ❌ W0（scripts/di-audit.ts） | ⬜ pending |
| 20-01-05 | 01 | 1 | CI-07 | feature | `bun test tests/Feature/routes-existence.e2e.ts` | ✅ | ⬜ pending |
| 20-01-06 | 01 | 1 | CI-01 | e2e | `playwright test --grep @smoke` | ✅（tag 待補） | ⬜ pending |
| 20-02-01 | 02 | 2 | CI-02,CI-04 | CI job | Workflow `typecheck` / `lint+format` jobs 綠燈 | ❌ W0（workflow 擴充） | ⬜ pending |
| 20-02-02 | 02 | 2 | CI-01,CI-03,CI-05,CI-06,CI-07,CI-08 | CI job | 7 並行 jobs 全部綠燈 | ❌ W0 | ⬜ pending |
| 20-02-03 | 02 | 3 | CI-01~08 | runbook | branch protection runbook 覆蓋所有 required checks | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bunfig.toml` — `[test].coverageThreshold = 0.8`（CI-03）
- [ ] `commitlint.config.cjs` — extends `@commitlint/config-conventional`（CI-05）
- [ ] `bun add -d @commitlint/cli @commitlint/config-conventional`
- [ ] `scripts/di-audit.ts` + `bun run di:audit` script（CI-08）
- [ ] `scripts/migration-drift.ts` + `bun run migration:drift` script（CI-06）
- [ ] Playwright smoke tag：`e2e/*.e2e.ts` 補上 `@smoke` tag（CI-01）
- [ ] `docs/ci/branch-protection-setup.md` runbook（D-22）
- [ ] Spike：`@gravito/core` IContainer token introspection API
- [ ] Spike：Bun `coverageThreshold` per-file vs aggregate 行為
- [ ] Spike：Orbit CLI 在 CI container 的 config path 處理

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Branch protection rules 設定 | CI-01~08 | GitHub UI-only 設定，無法 script 化；AGENTS.md 禁止自動改 GH settings | 依 `docs/ci/branch-protection-setup.md` 在 GitHub Settings → Branches 將所有 jobs 標為 required checks |
| Dummy PR 觸發 workflow | CI-01~08 | Phase gate 必須證明 CI 能 block merge | 開一個 dummy PR，故意違反 1 項守門點（如刻意降 coverage），確認該 job fail 且 PR cannot merge；修正後所有 jobs 綠燈 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

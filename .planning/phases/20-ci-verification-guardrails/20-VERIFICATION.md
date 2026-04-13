---
phase: 20
slug: ci-verification-guardrails
status: human_needed
verified_at: "2026-04-13T00:00:00Z"
---

# Phase 20 — Verification

## Goal (from ROADMAP)

把所有驗證守門點串入 GitHub Actions CI pipeline，讓每個 PR 都必須通過全部檢查才能合併至 main/develop，建立防回歸護欄。

## Must-haves

| Item | Result | Notes |
|------|--------|--------|
| Eight parallel jobs with exact kebab-case names | **Met** | Verified in `.github/workflows/ci.yml` and live PR #4 |
| Cache key uses `hashFiles('bun.lock', 'bun.lockb')` | **Met** | All jobs |
| Postgres on `migration-drift` + `e2e-smoke` only | **Met** | |
| `commitlint` PR-only + `fetch-depth: 0` + base/head SHAs | **Met** | |
| Runbook lists eight contexts + `gh api` | **Met** | `docs/ci/branch-protection-setup.md` |
| Branch protection applied | **Manual** | Documented only; admin uses runbook |
| All jobs green on representative PR | **Not met at snapshot** | See known-failures in `20-02-SUMMARY.md` |

## Automated checks (local)

- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` — pass
- Plan 20-02 Task 1 grep bundle — pass
- Plan 20-02 Task 2 runbook grep loop — pass

## Human verification

1. Open or use PR: https://github.com/CarlLee1983/draupnir/pull/4  
2. Confirm **Checks** list shows all eight job names (same spelling as runbook).  
3. Confirm jobs start in parallel (not a single serial job).  
4. Decide whether failing jobs (`unit-coverage`, `lint-format`, `commitlint`, and any others after run completes) must be fixed **before** marking Phase 20 complete, or accepted as documented known-failures per Plan 20-02 Task 3.  
5. Reply in the GSD thread with **`approved`** and optionally the PR URL to close the Plan 20-02 checkpoint formally.

## Verdict

**`human_needed`** — Implementation and documentation are in repo; merge-readiness and checkpoint sign-off depend on maintainer policy on failing checks and branch-protection application.

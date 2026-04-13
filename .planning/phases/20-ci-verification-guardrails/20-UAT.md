---
status: complete
phase: 20-ci-verification-guardrails
source:
  - .planning/phases/20-ci-verification-guardrails/20-01-SUMMARY.md
  - .planning/phases/20-ci-verification-guardrails/20-02-SUMMARY.md
  - .planning/phases/20-ci-verification-guardrails/20-VERIFICATION.md
started: "2026-04-13T12:05:00Z"
updated: "2026-04-13T12:20:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. PR #4 accessible with Checks tab
expected: 開啟 https://github.com/CarlLee1983/draupnir/pull/4，Checks 分頁顯示 CI 執行紀錄（sample run 24328101209）。
result: pass

### 2. Eight parallel CI jobs with exact names
expected: |
  Checks 清單顯示全部 8 個 job 名稱，拼寫與 docs/ci/branch-protection-setup.md 完全一致：
  `typecheck`、`lint-format`、`unit-coverage`、`migration-drift`、`routes-check`、
  `di-audit`、`e2e-smoke`、`commitlint`。
result: pass

### 3. Jobs start in parallel (not serial)
expected: |
  觀察 Actions run 24328101209 — 全部 8 個 job 的 startedAt 時間戳幾乎同時（差距 ~1 秒內），
  而非單一 serial job 依序執行。
result: pass

### 4. Failing-jobs policy decision
expected: |
  檢視 PR #4 目前失敗的 job（`unit-coverage`、`lint-format`、`commitlint` 等）
  並做出政策決定：
    A) 必須全綠才能關閉 Phase 20 → 回報 "fix first"
    B) 接受為 Plan 20-02 Task 3 已記錄的 known-failures → 回報 "accept known"
result: issue
reported: "A — fix first：PR #4 的 known-failures (unit-coverage、lint-format、commitlint) 必須修復為綠燈，才能關閉 Phase 20。"
severity: major

### 5. Checkpoint sign-off (approved)
expected: |
  在 GSD thread 回覆 `approved`（可附上 PR URL）以正式關閉 Plan 20-02 checkpoint
  並讓 Phase 20 可進入 milestone 歸檔流程。
result: pass
reported: "approved — Plan 20-02 架構交付本身簽核通過；known-failures 另列為 gap 由修復計畫跟進。"

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "PR #4 的全部 8 個 CI job（含 unit-coverage、lint-format、commitlint）在合併前必須為綠燈"
  status: failed
  reason: "User reported: A — fix first：known-failures 必須修復，不接受為已記錄忽略項"
  severity: major
  test: 4
  sub_issues:
    - job: unit-coverage
      likely_cause: "既有不相關測試失敗 + coverage gate (Plan 20-01 已提及)"
    - job: lint-format
      likely_cause: "Biome format drift on branch"
    - job: commitlint
      likely_cause: "PR range 內有 commit 不符合 conventional-commit 規範"
  artifacts: []
  missing: []

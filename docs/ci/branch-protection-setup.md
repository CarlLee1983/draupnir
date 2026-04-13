# Branch Protection 設定 Runbook

> Phase 20 CI Verification Guardrails 交付文件。
> Repo admin 依本 runbook 手動設定 `main` 與 `develop` 的 required status checks。
> Phase 20 本身**不自動設定 branch protection**（per CONTEXT.md D-21），因為：
> - 需 admin token 權限
> - 避免 phase 工作被 repo settings 授權問題卡住

## 前置條件

- 具有 repo admin 權限的 GitHub 帳號
- 本機已安裝 `gh` CLI（`brew install gh`）
- 已執行 `gh auth login` 並選擇 repo admin 權限 scope

## Required Status Checks 清單

以下 8 個 job 名稱必須全數被設為 required checks（名稱需與 `.github/workflows/ci.yml` 中的 job key 精確一致）：

| # | Job 名稱 | 守門內容 | Requirement |
|---|---|---|---|
| 1 | `typecheck` | TypeScript 型別檢查 | CI-02 |
| 2 | `lint-format` | Biome lint + format | CI-04 |
| 3 | `unit-coverage` | Unit test + 80% coverage threshold | CI-03 |
| 4 | `migration-drift` | DB migration vs Drizzle schema drift | CI-06 |
| 5 | `routes-check` | Routes invariance | CI-07 |
| 6 | `di-audit` | DI binding 完整性 | CI-08 |
| 7 | `e2e-smoke` | Playwright smoke（admin/member/CLI）| CI-01 |
| 8 | `commitlint` | Conventional commits 驗證 | CI-05 |

## 步驟 A：使用 `gh api` 指令設定（推薦）

### A-1. 設定 `main` branch

```bash
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
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F required_pull_request_reviews.dismiss_stale_reviews=true \
  -F restrictions=
```

> 將 `:owner/:repo` 改為實際 repo，例如 `CMG/Draupnir`。

### A-2. 設定 `develop` branch

重複 A-1，將 URL 的 `main` 改為 `develop`。

### A-3. 驗證設定

```bash
gh api repos/:owner/:repo/branches/main/protection | jq '.required_status_checks.contexts'
```

預期輸出為 8 個 context 名稱的 JSON array。

## 步驟 B：使用 GitHub Web UI 設定（備用）

1. 進入 `Settings → Branches → Branch protection rules`
2. 點擊 `Add rule`（或編輯既有 rule）
3. `Branch name pattern`：`main`（再為 `develop` 重複一次）
4. 勾選 `Require status checks to pass before merging`
5. 勾選 `Require branches to be up to date before merging`
6. 在 `Status checks that are required` 搜尋框依序加入上表 8 個 job 名稱
7. 勾選 `Require a pull request before merging` → `Require approvals`（至少 1）
8. 勾選 `Do not allow bypassing the above settings`（enforce admins）
9. 點擊 `Create` / `Save changes`

## 步驟 C：驗收（Dummy PR 流程）

Phase 20 交付完成後，建議以下列步驟驗證整體守門正確：

1. 從 `develop` 建立 feature branch
2. 故意違反 1 項守門點（例如：刪掉一行測試讓 coverage 掉到 80% 以下）
3. 推送並開 PR 指向 `develop`
4. 觀察：
   - 對應 job（`unit-coverage`）顯示 red
   - PR 頁面顯示 `Required status check is failing`
   - `Merge` 按鈕為 disabled
5. 修正違反項，re-push，8 jobs 全綠後 `Merge` 按鈕變 enabled

## 移除 Branch Protection（緊急回滾用）

```bash
gh api -X DELETE repos/:owner/:repo/branches/main/protection
```

> 僅在 CI 守門本身故障（如 GitHub Actions outage）且需緊急合併時使用。事後應立即重新啟用。

## 參考

- GitHub Docs - Branch Protection API：https://docs.github.com/rest/branches/branch-protection
- Phase 20 CONTEXT.md §D-21, D-22
- `.github/workflows/ci.yml`（本 runbook 對應的 CI 定義）

---

*Last updated: 2026-04-13（Phase 20 Plan 20-02 交付）*

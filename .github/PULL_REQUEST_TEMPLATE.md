## 變更摘要

<!-- 簡述本 PR 做了什麼、為什麼 -->

## 變更類型

- [ ] 新功能 (feat)
- [ ] 修 bug (fix)
- [ ] 重構 (refactor)
- [ ] 文件 (docs)
- [ ] 測試 (test)
- [ ] 其他

## TDD Evidence

- [ ] TDD Slice 已包含於 issue、PR、commit note、spec 註解或連結文件中。
- [ ] 若涉及 domain/application 規則，已新增或更新 unit test。
- [ ] 若涉及 business flow 或跨模組行為，已新增或更新 acceptance use case。
- [ ] 若涉及 endpoint/auth/validation/response 變更，已新增或更新 API contract。
- [ ] Browser E2E 僅用於需要瀏覽器驗證的行為。
- [ ] 未 mock 內部 repository / application service / auth middleware / validation。

## Checklist

- [ ] 測試通過（`bun test` 或 targeted tests）
- [ ] 類型檢查通過（`bun run typecheck`）
- [ ] Lint 通過（`bun run lint`）
- [ ] 若本次**新增 Controller / Application Service 入口**，或**改變某個 User Story 的關鍵規則**，已更新對應模組的 `docs/draupnir/specs/**/user-stories.md`（含 Coverage map）
- [ ] 若涉及 UI 變更，有執行視覺驗證（截圖 / 錄影）

## 驗證命令

```bash
# Paste actual commands run, for example:
# bun test src/Modules/<Module>/__tests__/<Spec>.test.ts
# bun test tests/Acceptance/UseCases/<Module>/<flow>.spec.ts
# bun test tests/Acceptance/ApiContract/<module>-endpoints.spec.ts
# bun run typecheck
# bun run lint
```

## 已知風險 / 後續

<!-- 記錄跳過的測試層、被既有問題阻擋的 full checks，或填 N/A。 -->

## 相關 Issues / Stories

<!-- 例：Closes #123、Ref US-APIKEY-003 -->

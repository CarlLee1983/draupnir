---
quick_task: 260425-tdd
status: complete
completed_at: 2026-04-25
commit: pending
---

# Summary

新增 `Acceptance-First TDD Pattern for Draupnir` 方法論文件，將 2026-04-24 的 DDD acceptance testing design 抽象成可套用於目前與未來開發的 TDD 泛式。

## Changes

- 新增 `docs/superpowers/specs/acceptance-first-tdd-pattern.md`
- 定義 Acceptance Spine TDD 流程。
- 補上 TDD Slice checklist。
- 明確區分 Domain Unit / Application Unit / Acceptance Use Case / API Contract / Browser E2E 的責任。
- 定義 mock/fake policy，防止將 repository、application service、auth middleware、validation 等專案自身真相 mock 掉。
- 加入 feature、refactor、bug fix 的導入泛式與 Definition of Done。
- 加入 Draupnir 常用驗證命令與 rollout rule。

## Verification

- 文件人工檢查完成。
- 未修改 production code 或既有測試。
- 未執行程式測試；本次為文件新增。

## Remaining Risks

- 需後續在實際 feature / PR template / GSD plan template 中引用，否則仍可能只停留在文件層。

---
quick_task: 260425-tdd
status: complete
title: Acceptance-First TDD 泛式文件
created_at: 2026-04-25
---

# Plan

## Goal

將 `docs/superpowers/specs/2026-04-24-ddd-acceptance-testing-design.md` 的驗收層設計抽象成可重複套用於目前與未來開發的 TDD 泛式，讓 vibe coding 仍受可執行驗收規格約束。

## Scope

- 新增一份方法論文件：`docs/superpowers/specs/acceptance-first-tdd-pattern.md`
- 聚焦流程、測試分層、mock/fake policy、feature checklist、模組導入規則。
- 不修改 production code 或既有測試。

## Steps

1. 萃取 Acceptance Spine TDD 的核心流程。
2. 寫出固定 feature slice checklist。
3. 定義 Unit / Application / Acceptance / API Contract / E2E 分工。
4. 定義 fake policy，避免 mock 掉專案自身業務真相。
5. 加入 Draupnir 專案目錄與命令對應。
6. 補 Summary 與 STATE quick task 紀錄。

## Verification

- Markdown 文件可讀性檢查。
- 確認未更動既有 source/test code。

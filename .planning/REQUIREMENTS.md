# Requirements: Draupnir v1.4 Hardening & Refinement

**Defined:** 2026-04-12
**Core Value:** 提高系統穩定性、簡化維護流程、為未來功能擴展奠定基礎

## v1.4 Requirements

### 背景任務統一化 (Phase 18)

- [ ] **JOBS-01**: 所有 cron/scheduled 任務使用統一的任務運行器（Bun.cron or similar）
- [ ] **JOBS-02**: `ScheduleReportService` 從 `boot()` 遷出至統一任務管理器
- [ ] **JOBS-03**: 移除 `boot()` 中的零散定時邏輯，集中定時任務定義
- [ ] **JOBS-04**: 任務運行器支援單個任務重試和失敗恢復機制

### Alerts 模組解耦 (Phase 19)

- [ ] **ALERTS-01**: 重構 Alerts 倉庫使用 ORM-agnostic `AggregateSpec` 模式（參考 Phase 17）
- [ ] **ALERTS-02**: Alerts 模組不依賴任何核心業務邏輯層的實現細節
- [ ] **ALERTS-03**: Alerts 系統可在無 DI 容器的情況下進行單元測試
- [ ] **ALERTS-04**: Webhook 和 Email 適配器實現完全解耦
- [ ] **ALERTS-05**: 警報配置、歷史記錄和發送日誌完全隔離

### CI 驗證加固 (Phase 20)

- [ ] **CI-01**: Playwright PDF 生成測試集成進 CI pipeline
- [ ] **CI-02**: 自動 TypeScript 類型檢查防止類型錯誤合併
- [ ] **CI-03**: 測試覆蓋率驗證（最低 80%）於每次提交檢查
- [ ] **CI-04**: 代碼品質檢查（linting、formatting）於 CI 中執行
- [ ] **CI-05**: 提交歷史驗證防止無效提交信息進入 main

## Out of Scope

| 功能 | 原因 |
|------|------|
| Redis 持久化 | 後續版本考慮，目前 BullMQ 延期 |
| 運行時網關切換 | 網關是編譯時/ServiceProvider 決策 |
| 新的警報通知渠道 | v1.4 聚焦模組解耦，新渠道於 v2+ 實現 |
| 分佈式任務排隊 | 當前 Bun.cron 足夠，v2+ 考慮 BullMQ |

## Traceability

| 需求 | 階段 | 狀態 |
|------|------|------|
| JOBS-01 | Phase 18 | Pending |
| JOBS-02 | Phase 18 | Pending |
| JOBS-03 | Phase 18 | Pending |
| JOBS-04 | Phase 18 | Pending |
| ALERTS-01 | Phase 19 | Pending |
| ALERTS-02 | Phase 19 | Pending |
| ALERTS-03 | Phase 19 | Pending |
| ALERTS-04 | Phase 19 | Pending |
| ALERTS-05 | Phase 19 | Pending |
| CI-01 | Phase 20 | Pending |
| CI-02 | Phase 20 | Pending |
| CI-03 | Phase 20 | Pending |
| CI-04 | Phase 20 | Pending |
| CI-05 | Phase 20 | Pending |

**覆蓋率：**
- v1.4 需求：14 個
- 映射到階段：14 個
- 未映射：0 ✓

---
*需求定義：2026-04-12*
*最後更新：2026-04-12 初始定義後*

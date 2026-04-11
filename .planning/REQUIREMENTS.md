# Milestone v1.2 Requirements

**Dashboard 分析和報告 — 為多角色使用者提供完整的 API 使用分析和每月決算報告**

---

## v1.2 Requirements

### Data Correctness & Permission Foundation (先決條件 — 第 1 階段)

**這些是現有系統中的 bugs，必須先修復才能開始 chart 開發。**

- [ ] **DASHBOARD-P1**: 移除 Admin Dashboard 的硬編碼樣本數據
  - 當前: `src/Pages/Admin/Dashboard/Index.tsx` 行 21–27 包含 `sampleUsageData` 字面量
  - 需求: 建立 `AdminDashboardPage.ts`，移除硬編碼，從 `GetDashboardSummaryService` 獲取真實數據
  - 驗證: Admin 看到真實組織成本，非樣本數據

- [ ] **DASHBOARD-P2**: 修復日誌 DTO 字段名稱不匹配
  - 當前: Bifrost 返回 `inputTokens` (camelCase)，但 React 期望 `input_tokens` (snake_case)
  - 影響: 圖表顯示零代幣 (字段始終 `undefined`)
  - 需求: 建立 `UsageLogDTO` Zod schema，在 `UsageAggregator` 中統一為 camelCase，更新 React 組件
  - 驗證: 代幣圖表顯示正確的輸入/輸出代幣計數

- [ ] **DASHBOARD-P3**: 實施 MEMBER 角色的每用戶金鑰範圍
  - 當前: `GetDashboardSummaryService` 返回全組織的使用統計（無論調用者角色）
  - 安全風險: MEMBER 用戶看到其他成員的 API 金鑰成本和使用
  - 需求: 按角色進行權限檢查 — MEMBER 只看自己的金鑰，MANAGER+ 看組織的
  - 驗證: 多個成員，權限隔離測試通過，組織級別報告給 MANAGER+

### Usage Overview (使用概覽)

- [ ] **DASHBOARD-01**: 使用者可看到組織的 7/30/90 天成本、請求、代幣摘要卡
  - 數據源: `GetDashboardSummaryService` → 聚合 `usage_records` 按時間窗口
  - UI: 4 個 KPI 卡（成本、請求數、總代幣、平均延遲）+ 時間窗口選擇器（按鈕組或下拉菜單）
  - 驗證: 每個卡顯示正確的聚合，按時間窗口變化

- [ ] **DASHBOARD-02**: 使用者可在時間窗口內查看成本隨時間趨勢折線圖
  - 圖表: AreaChart（Recharts），按日期存儲
  - 數據源: `GetCostTrendsService` → 聚合 `usage_records` 按日期分組
  - 互動: 懸停顯示日期 + 成本，無縮放（7/30/90 天足夠）
  - 驗證: 成本隨時間正確計算，無異常峰值

### Cost Analysis (成本分析)

- [ ] **DASHBOARD-03**: 使用者可看到成本按模型分解的柱狀圖
  - 圖表: BarChart（Recharts），按花費排序 DESC
  - 數據源: `GetModelComparisonService` → `SELECT model, SUM(cost) FROM usage_records GROUP BY model`
  - 頂部模型: 顯示前 10 個
  - 驗證: gpt-4o 成本 > claude-sonnet 成本（基於實際日誌）

- [ ] **DASHBOARD-04**: 工程師可看到代幣使用（輸入 vs 輸出）堆疊面積圖
  - 圖表: AreaChart stacked，按日期，兩層（輸入代幣、輸出代幣）
  - 顏色: 藍色 = 輸入，橙色 = 輸出
  - 數據源: `GetCostTrendsService` 擴展 → `SUM(input_tokens), SUM(output_tokens)` 按日期
  - 驗證: 輸出/輸入比例合理（通常輸出 < 輸入），無零值

- [ ] **DASHBOARD-05**: 使用者可看到模型比較表（成本、請求數、平均延遲）
  - 表格: 行 = 模型，列 = 成本（USD）、請求數、平均延遲（ms）
  - 排序: 可點擊列標頭排序
  - 數據源: `GetModelComparisonService` → GROUP BY model + 計算平均延遲
  - 驗證: 模型正確排序，數字匹配 KPI 卡

### Monthly Report (每月決算)

- [ ] **DASHBOARD-06**: 每月自動生成高層決算 PDF 報告
  - 內容: 封面 + 執行摘要（成本決算、KPI 卡、趨勢摘要）
  - 頻率: 每月第 1 天 00:00 UTC 自動生成上月報告
  - 格式: PDF，可通過 Dashboard 下載或發送至郵件（v1.3）
  - 方法: 使用 `window.print()` 輸出（v1.2），或 Puppeteer（v1.3，當需要郵件送達）
  - 驗證: PDF 包含所有 KPI，成本決算正確

---

## Future Requirements (延遲至 v1.2.x/v1.3)

These are validated features, deferred by priority or complexity:

### Differentiators (v1.2.x)
- **期間對比**: 本月 vs 上月成本 KPI 差異 badge（+5% / -3%）
- **按金鑰細分**: 表格顯示每個 API Key 的成本分解（需 AppApiKey 名稱加入）
- **錯誤率趨勢**: 失敗請求 % 按日期折線圖
- **多日期選擇**: 自訂開始日期和結束日期（不只是預設窗口）

### Advanced Analytics (v1.3+)
- **成本預測**: 線性趨勢對下 7 天/30 天成本的投影
- **效率散點圖**: X = 成本，Y = 請求，大小 = 代幣（識別低效模型）
- **閾值警報**: 成本超過 $X 時通知
- **實時 WebSocket 儀表板**: 替換 5 分鐘快取為接近即時的更新
- **自訂佈局**: 拖放添加/移除圖表，保存偏好設定

---

## Out of Scope

### Not in v1.2

- **成本預測/異常檢測** — 機器學習模型超出範圍；v1.3+ 如需
- **多租戶成本分配** — 假設 Draupnir 上的一個組織 = 一個 Bifrost 客戶；跨租戶分配是業務決策，非技術決策
- **實時 WebSocket 儀表板** — 5 分鐘快取對成本趨勢「夠新鮮」；實時基礎設施複雜性 vs 收益不符
- **可自訂的報告佈局** — v1.2 使用固定佈局；可自訂報告在業務確認需要後在 v1.3 加入
- **與外部分析工具的集成** (Datadog, NewRelic) — 假設內部 Dashboard 足夠；第三方集成是未來決策

---

## Traceability Matrix

| REQ-ID | Feature | Phase | Status |
|--------|---------|-------|--------|
| DASHBOARD-P1 | Remove hardcoded sample data | 1 | Pending |
| DASHBOARD-P2 | Fix field name mismatch | 1 | Pending |
| DASHBOARD-P3 | Implement per-role permission scoping | 1 | Pending |
| DASHBOARD-01 | Usage overview cards + time window | 3 | Pending |
| DASHBOARD-02 | Cost over time trend chart | 3 | Pending |
| DASHBOARD-03 | Cost by model bar chart | 3 | Pending |
| DASHBOARD-04 | Token usage stacked area chart | 3 | Pending |
| DASHBOARD-05 | Model comparison table | 3 | Pending |
| DASHBOARD-06 | Monthly PDF report | 5 | Pending |

---

## Research Artifacts

See `.planning/research/` for detailed findings:
- `STACK.md` — Recharts compatibility, zero new dependencies, integration patterns
- `FEATURES.md` — Chart types, interactivity, data freshness, P1/P2 tiers
- `ARCHITECTURE.md` — Cached aggregation decision, schema design, BifrostSyncService, DI integration
- `PITFALLS.md` — Permission leaks, data freshness confusion, performance cliffs, test coverage gaps
- `SUMMARY.md` — Executive summary with roadmap implications

---

**Last updated: 2026-04-11** — Research complete, requirements drafted

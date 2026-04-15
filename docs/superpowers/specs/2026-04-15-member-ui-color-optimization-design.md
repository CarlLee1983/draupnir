# 設計文檔：Member 頁面提示配色優化 (Amber Theme)

## 1. 目的
修正目前 Member 頁面在「請先選擇組織」時顯示紅色（Destructive）字體的問題。紅色在深色背景下視覺過於突兀且不協調，容易被誤認為嚴重系統故障。改用琥珀色（Amber）以提供更溫和且具引導性的使用者體驗。

## 2. 核心變更
### 2.1 建立統一組件 `Banner`
在 `resources/js/components/ui/banner.tsx` 建立標準化組件，取代各頁面自行實作的 `InfoCard` 或 `InfoBanner`。

**樣式定義 (Tailwind)：**
- **Warning (用於選擇組織):**
  - Border: `border-amber-500/20`
  - Background: `bg-amber-500/10`
  - Text: `text-amber-400`
- **Destructive (用於載入失敗):**
  - Border: `border-destructive/50`
  - Background: `bg-destructive/10`
  - Text: `text-destructive`

### 2.2 邏輯判定
組件或頁面應根據 `error.key` 自動判定語調：
- 若 `error.key` 以 `.selectOrg` 結尾 -> 使用 `warning` (Amber)。
- 其他錯誤 -> 使用 `destructive` (Red)。

## 3. 實作範圍
- **Member Dashboard**: 取代區域性的 `InfoCard`。
- **Member Cost Breakdown**: 取代區域性的 `InfoBanner`。
- **Member API Keys**: 取代手寫的紅色邊框 `div`。
- **Member Usage**: **修復目前完全沒顯示錯誤提示的問題**，並套用 `Banner`。
- **Member Alerts**: 統一提示樣式。
- **Member Contracts**: 取代手寫的紅色邊框 `div`。

## 4. 驗證準則
- 在未選擇組織時，各頁面提示應呈現溫和的琥珀色。
- 在真正的 API 載入失敗時，應維持紅色提示。
- `MemberUsage` 頁面在未選擇組織時能正確顯示提示。

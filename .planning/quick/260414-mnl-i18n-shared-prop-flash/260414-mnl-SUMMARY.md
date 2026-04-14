---
quick_id: 260414-mnl
slug: i18n-shared-prop-flash
status: complete
files_modified:
  - docs/superpowers/specs/2026-04-14-frontend-i18n-design.md
---

# Quick 260414-mnl: i18n SharedData Partial + Flash Migration — Summary

**一句話摘要**：將 `InertiaSharedData.messages` 從 total type `Messages` 改為 `Partial<Messages>`，並新增結構化 flash cookie 遷移章節（Step A/B/C）及 Phase 0 前置步驟。

## 修改內容

### Task 1 — 修正 `InertiaSharedData.messages` 型別

- `InertiaSharedData.messages` 從 `Messages` 改為 `Partial<Messages>`
- `createTranslator(messages: Messages)` 改為 `createTranslator(messages: Partial<Messages>)`
- 移除原 blockquote（"messages 必須為完整 catalog"），改為 `### 為何使用 Partial<Messages> 而非 Messages` 說明段落
- 說明段落涵蓋三個理由：safe default 相容性、完整性由 `loadMessages()` 保證、前端容錯行為已處理 partial

### Task 2 — 新增 `## Flash 與訊息遷移` 章節

新章節位於 `## 遷移計畫` 之前，包含：

- **現況**：原始字串 cookie 寫入模式
- **目標 wire format**：`flash: { success?: I18nMessage; error?: I18nMessage }`
- **遷移路徑（分三步）**：
  - Step A：JSON 序列化 flash cookie，`parseFlash()` 向下相容解析
  - Step B：`toI18nMessage()` 轉換函式，error-code → MessageKey 映射層
  - Step C：型別約束收斂，移除過渡期 `| string`
- **遷移優先順序表**：Step A → B → C 範圍與完成標準

### Task 3 — 更新既有遷移計畫

- 在 Phase 1 之前新增 **Phase 0 — Flash Wire Format 遷移（前置）**，連結至新章節 Step A
- Phase 2 補充一行：`error: result.message` 透過 `toI18nMessage()` 轉換，連結至新章節 Step B

## 驗證結果

| 驗證項目 | 結果 |
|---------|------|
| `InertiaSharedData.messages` 為 `Partial<Messages>` | 通過（行 201） |
| `createTranslator` 接受 `Partial<Messages>` | 通過（行 71） |
| `## Flash 與訊息遷移` 含 Step A/B/C | 通過（行 265+） |
| `## 遷移計畫` 含 Phase 0 | 通過（行 379） |
| 原有章節完整保留 | 通過（無其他段落被移除） |

## 文件狀態

`docs/superpowers/specs/2026-04-14-frontend-i18n-design.md` 已更新，可供實作參照。

# Gravito i18n 替換設計

## 目的

將專案中的硬編碼 UI 文案改為 `gravito i18n` 管理，但維持 API 層的錯誤訊息一律使用英文。

## 範圍

### API 層

- 所有 HTTP API 回應中的 `message` 一律使用英文。
- 保留既有 `error code`，不因 locale 改變而切換字串。
- 不引入 API locale negotiation。

### 頁面層

- 所有 Inertia / UI 顯示文案改由 `gravito i18n` 提供。
- 支援 `zh-TW` 與 `en`。
- 缺少翻譯時直接顯示 key，方便開發期抓漏。

## 現況觀察

目前硬編碼訊息主要出現在：

- `src/Modules/Auth/Presentation/Controllers/AuthController.ts`
- `src/Modules/SdkApi/Presentation/Controllers/SdkApiController.ts`
- `src/Pages/Member/MemberDashboardPage.ts`
- `src/Pages/Admin/*` 與其他 Inertia page handlers

現有專案已存在 locale 概念，且 `UserProfile` 預設語系為 `zh-TW`，適合直接作為頁面層的 locale 來源。

## 設計

### 1. i18n 入口

建立一個共用的頁面字串存取介面，作為 `gravito i18n` 的唯一入口。

責任：

- 讀取當前 request 的 locale
- 提供 `t(key, params?)`
- 缺 key 時回傳 key 本身

### 2. locale 來源

頁面層使用既有 locale 優先序：

1. 使用者設定
2. route / tenant context
3. cookie / session
4. `Accept-Language`
5. `zh-TW`

API 層不依 locale 選字串，因此不需要共用同一個翻譯解析流程。

### 3. key 命名

依模組分組，避免頁面與業務邏輯混在一起：

- `auth.*`
- `admin.*`
- `member.*`
- `sdk-api.*`

範例：

- `auth.logout.unauthorized`
- `auth.logout.missingToken`
- `member.dashboard.selectOrg`
- `admin.users.loadFailed`

### 4. 翻譯檔結構

每個模組維持一份 `zh-TW` 與 `en` 字典，避免跨模組耦合。

建議結構：

- `src/Shared/Infrastructure/i18n/locales/zh-TW/*.ts`
- `src/Shared/Infrastructure/i18n/locales/en/*.ts`
- `src/Shared/Infrastructure/i18n/index.ts`

### 5. API 文案策略

API 層直接改成英文常數字串，例如：

- `Unauthorized`
- `Missing token`
- `Invalid Authorization header`

如果訊息只服務 API 消費者，不需要再包進 i18n。

### 6. 頁面文案策略

Inertia page handler 只輸出 key 對應的結果，不直接寫死中文。

例如：

- `error: t('member.dashboard.selectOrg')`
- `error: t('admin.users.loadFailed')`

## 變更原則

- 先替換頁面層可見字串，再替換剩餘 Inertia 結果中的訊息。
- API 層只做英文化，不導入翻譯依賴。
- 不做自動偵測 locale 的 API response 包裝。

## 測試

### 必測

- 頁面層在 `zh-TW` / `en` 會輸出不同文案。
- 缺少 key 時顯示 key 本身。
- API 層錯誤訊息固定為英文。
- 既有 error code 不變。

### 建議測試位置

- i18n helper 單元測試
- 代表性 page handler 測試
- 代表性 API controller 測試

## 風險

- 若先替換字串但未補齊 key，頁面會直接出現 key，這是預期的抓漏行為。
- 如果某些前端元件直接吃 controller message，需要確認是否屬於頁面層或 API 層，以免重複翻譯。

## 結論

本次改造採用「API 英文化、頁面 i18n 化」的分層策略。這樣可以保留 API 穩定性，同時把 UI 文案集中管理，後續新增語系時只需擴充頁面字典。

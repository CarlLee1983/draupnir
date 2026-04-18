# 7. 開發者 API 分區

本分區覆蓋**面向外部開發者**的 API 層：
- **SdkApi** — App-Key 認證的 AI 請求代理（chat completions、usage、balance；相容 OpenAI 風格 path `/sdk/v1/...`）
- **CliApi** — CLI 客戶端專用代理（含 OAuth Device Flow、Claude Code / Codex 等 CLI 整合）
- **DevPortal** — 開發者入口頁、App 註冊、App-Key 管理、Webhook 設定、API 文件

詳細規格與 User Stories：

- **User Stories** — [`user-stories.md`](./user-stories.md)

---

## 相關模組

| 模組 | 角色 |
|---|---|
| SdkApi | OpenAI 風格 API proxy；以 App-Key 認證 |
| CliApi | CLI 專用 OAuth Device Flow + proxy |
| DevPortal | 開發者入口 UI / API；註冊 App、發 App-Key、設 webhook、讀 API 文件 |

## 相關 Personas

此分區的主角是非人類 actor：
- [SDK Client](../personas.md#sdk-client)（外部程式）
- 與之互動的人類則是 **Org Manager / Member**（在 DevPortal 註冊 App、管理 App-Key）與 **Cloud Admin**（審視 / 撤銷 App）

## 相關核心概念的延伸

- **App-Key 認證**：與 `3-api-keys/user-stories.md` 的 [AppApiKey](../3-api-keys/user-stories.md#appapikey) 章節共用底層（同一組 service）；本分區聚焦於 **client 端怎麼用 App-Key**
- **Credit / Balance**：見 [4-credit-billing/user-stories.md](../4-credit-billing/user-stories.md) 的 Credit 章節

# Draupnir 文件庫

本目錄依**用途**分類，方便人讀與代理檢索。

## 分類總覽

| 區域 | 路徑 | 說明 |
|------|------|------|
| **本專案 OpenAPI** | [`openapi.yaml`](./openapi.yaml) | Draupnir HTTP API 規格（YAML 為來源）；測試與執行時 `/api/openapi.json` 由此檔解析輸出 JSON。 |
| **專案規劃** | [`draupnir/`](./draupnir/) | 路線圖、設計規格、實作計畫、審查紀錄。 |
| **外部參考** | [`reference/`](./reference/) | Bifrost 上游 OpenAPI 快照、轉出之端點 Markdown 等（非 Draupnir API）。 |

## `draupnir/` 一覽

詳細索引見 [`draupnir/README.md`](./draupnir/README.md)。

- **`specs/`** — 設計規格（決策與架構，較穩定）
- **`plans/`** — 可執行實作計畫（依任務拆解、含核取框追蹤）
- **`reviews/`** — 程式審查／對抗審查等一次性紀錄
- **`ROADMAP.md`** — 產品／階段路線（高層次）

## `reference/` 一覽

詳細索引見 [`reference/README.md`](./reference/README.md)。

- **`bifrost/openapi.json`** — Bifrost Gateway 官方 OpenAPI 快照（供 `convert_openapi.js` 與對照用）
- **`bifrost-api/`** — 由該 JSON 轉出的端點說明 Markdown（依功能分子目錄）
- **`Bifrost.md`** — 上游 OpenAPI 官方下載連結

## 維護備註

- 若更新 Bifrost 規格：將官方 `openapi.json` 覆寫至 `docs/reference/bifrost/openapi.json`，再執行 `scripts/convert_openapi.js`；輸出目錄為 `docs/reference/bifrost-api/`。
- ✅ 舊路徑 `docs/Bifrost_API_Final/` 已移除；`docs/superpowers/` 已整合至 `docs/draupnir/`（2026-04-10）

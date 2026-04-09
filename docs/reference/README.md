# 外部參考文件

與 Draupnir **原始碼無直接對應**、但實作時會查閱的上游或匯入資料。

## 內容

| 項目 | 說明 |
|------|------|
| [`bifrost/`](./bifrost/) | Bifrost **官方 OpenAPI JSON 快照**（`openapi.json`） |
| [`Bifrost.md`](./Bifrost.md) | 官方 OpenAPI JSON 網址（下載／更新快照時用） |
| [`bifrost-api/`](./bifrost-api/) | 由 `bifrost/openapi.json` 轉成之端點說明 Markdown（依主題分子目錄） |

## 重新產生 `bifrost-api/`

1. 將官方 `openapi.json` 覆寫至 [`bifrost/openapi.json`](./bifrost/openapi.json)（或確認 `scripts/convert_openapi.js` 的 `INPUT_FILE` 指向正確檔案）。
2. 執行：

```bash
node scripts/convert_openapi.js
```

輸出寫入 `docs/reference/bifrost-api/`。

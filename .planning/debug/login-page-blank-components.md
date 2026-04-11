# Debug: `/login` HTML OK but React/Inertia 元件不顯示

**Date:** 2026-04-11  
**Symptom:** `http://localhost:3000/login` 回 200，但畫面上沒有登入表單（空白或僅殼層）。

## Root cause

1. **Inertia 首頁**由 Bun（`PORT` 預設 **3000**）回傳 `app.html`，其中注入的 script 指向 **Vite dev server**（`VITE_DEV_SERVER`，預設 `http://localhost:5173`）。

2. **`vite.config.ts` 使用 `base: '/build/'`**：Vite 開發伺服器實際提供的 URL 是 **`http://localhost:5173/build/...`**（終端也會印 `Local: http://localhost:5173/build/`）。若 HTML 仍指向根路徑的 `/@vite/client` 與 `/resources/js/app.tsx`，會得到 **404**（`net::ERR_ABORTED`）。

3. **修正（已實作）**：`ViteTagHelper` 開發模式改為產生帶 **`/build/`** 前綴的 URL；可選環境變數 **`VITE_BASE_PATH`**（預設 `/build/`）與 `vite.config` 的 `base` 對齊。

4. **若 5173 上沒有跑 Vite**，或 **5173 被其他程式占用**，同樣會載入失敗；請確認 `bun run dev:frontend` 已啟動且佔用的是預期 port。

## 驗證方式

（`base: '/build/'` 時路徑需含 **`/build`**。）

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:5173/build/@vite/client
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:5173/build/resources/js/app.tsx
```

若為 404 / 連線失敗 → Vite 未啟動或 port 錯誤。

## 修復選項（擇一）

### A. 雙程序開發（建議）

終端 1：

```bash
bun run dev:frontend   # Vite，預設 5173，需佔用該 port
```

終端 2：

```bash
bun run dev            # Bun API + Inertia HTML，預設 3000
```

或單次：`bun run dev:all`（見 `package.json`）。

若 5173 已被占用，請關閉占用程式，或改 Vite port 並設環境變數：

```bash
# 例：改跑 5174
VITE_DEV_SERVER=http://localhost:5174 bun run dev
```

（Vite 本身也要用相同 port 啟動，例如 `vite --port 5174`。）

### B. 不跑 Vite、只吃 build（單一後端）

```bash
bun run build:frontend
SERVE_VITE_BUILD=true bun run dev
```

此時資產自 `public/build` + manifest 載入，不依賴 5173。

## 相關程式

- `resources/js/app.tsx` — `import.meta.glob('./Pages/**/*.tsx', { eager: true })`，元件名 `Auth/Login` → `./Pages/Auth/Login.tsx`
- `src/views/app.html` — `script[data-page="app"]` + `#app` 與 Inertia v3 預設一致，**非**模板 bug。

## 與「無法登入」UAT blocked 的關係

若僅見空白頁，使用者可能誤以為是帳密問題；先確認 **Console Network** 裡 `app.tsx` / `@vite/client` 是否 200，再測登入 API。

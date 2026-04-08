# Config 架構

集中管理應用與 Orbits 設定，由 `config/index.ts` 匯出並在 bootstrap 組裝給 `defineConfig`。

| 檔案 | 用途 |
|------|------|
| `app.ts` | 應用：name、env、port、VIEW_DIR、debug、url |
| `database.ts` | Atlas ORM（ENABLE_DB !== 'false' 時注入） |
| `cache.ts` | Stasis 快取（可選） |
| `types.ts` | 型別（AppConfig 等） |
| `index.ts` | 匯出各 config、`buildConfig(port?)`、`useDatabase` |

Bootstrap 使用方式：

```ts
import { buildConfig, useDatabase } from '../config'

defineConfig({
  config: buildConfig(port),
  orbits: [OrbitPrism, ...(useDatabase ? [OrbitAtlas] : []), OrbitSignal],
})
```

環境變數見專案根目錄 `.env.example`。

新增模組時若需改動 Orbits 或設定，請對照 [docs/MODULE_ADD_CHECKLIST.md](../docs/MODULE_ADD_CHECKLIST.md) 的「選做設定」。

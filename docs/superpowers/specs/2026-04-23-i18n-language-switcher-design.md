# 語系切換功能設計 (I18n Language Switcher)

## 1. 目的 (Purpose)
實作 Draupnir 平台的語系切換功能，讓使用者能手動選擇偏好語系（目前支援 `zh-TW` 與 `en`），並將偏好持久化。

## 2. 背景與現況 (Context)
- 專案已使用 `@gravito/cosmos` 作為 i18n 核心。
- 目前語系解析 (`resolvePageLocale.ts`) 僅依賴 `accept-language` HTTP Header，無法由使用者主動控制。
- 前端已具備 `useTranslation` hook 與 Inertia Shared Props 載入翻譯資料。

## 3. 設計方案 (Proposed Design)

### 3.1 後端架構 (Backend)
1. **語系解析器更新 (`src/Shared/Infrastructure/I18n/resolvePageLocale.ts`)**:
   - 檢查 `draupnir_locale` Cookie。
   - 若無 Cookie，退回檢查 `accept-language` Header。
   - 預設值為 `zh-TW`。

2. **控制器 (`src/Website/Http/Controller/LocaleController.ts`)**:
   - 實作 `switchLocale` 方法，接收 `locale` 參數。
   - 驗證是否為支援語系 (`zh-TW`, `en`)。
   - 設定 `draupnir_locale` Cookie（MaxAge 設為 1 年）。
   - 執行 Inertia 重新載入，確保前端重新獲取 `sharedProps`。

3. **路由註冊 (`src/Website/bootstrap/registerWebsiteRoutes.ts`)**:
   - 註冊 `POST /lang` 路由。

### 3.2 前端架構 (Frontend)
1. **導覽列更新 (`resources/js/components/layout/TopBar.tsx`)**:
   - 加入語系切換選單。
   - 顯示目前語系圖示與名稱。
   - 點擊選項時，透過 `router.post('/lang', { locale: '...' })` 發送請求。

2. **翻譯 Key 新增**:
   - 在 `zh-TW.ts` 與 `en.ts` 中新增相關 Key (如 `ui.layout.topBar.language`, `ui.common.lang.zh-TW`, `ui.common.lang.en`)。

## 4. 測試計畫 (Testing)
- **單元測試**: 驗證 `resolvePageLocale` 的優先權。
- **整合測試**: 模擬 `POST /lang` 請求，確認 Cookie 已正確設定。
- **E2E 測試**: 在瀏覽器點擊切換器，確認 UI 翻譯即時更新。

## 5. 成功指標 (Success Criteria)
- 使用者點擊切換後，無需重新整理頁面，UI 立即更新語系。
- 關閉瀏覽器後再開啟，仍能記住上次選擇的語系。

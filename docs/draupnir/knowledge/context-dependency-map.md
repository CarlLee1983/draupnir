# Context Dependency Map

這份文件把 Draupnir 的 bounded context **依賴關係與可接受方向**整理成文字版矩陣，方便快速判斷：

- 哪個模組是上游
- 哪個模組是下游
- 哪些依賴是合理的
- 哪些依賴應該避免

更完整的目錄語意與職責說明見 [`module-boundaries.md`](./module-boundaries.md)；**目前程式碼**的跨模組 `import` 與協調環說明見 [`../architecture/module-dependency-map.md`](../architecture/module-dependency-map.md)。

## 讀圖方式

- 矩陣為 **From \\ To**：列（From）是否宜依賴欄（To）。
- `✓` 表示合理且已預期的依賴（含常見埠／應用服務呼叫）。
- `△` 表示可以接受，但應維持**介面穩定**、縮小範圍，或僅限讀取／授權語境。
- `✗` 表示不建議（易變成共用 ORM、雙向滲透或責任混淆）。
- `-` 為對角線（自身）。

## 核心領域與讀模型（10×10）

欄／列：`Foundation`、`Auth`、`Profile`、`Organization`、`ApiKey`、`Dashboard`、`Credit`、`Contract`、`AppModule`、`AppApiKey`。

| From \\ To | Foundation | Auth | Profile | Organization | ApiKey | Dashboard | Credit | Contract | AppModule | AppApiKey |
|---|---|---|---|---|---|---|---|---|---|---|
| Foundation | - | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Auth | △ | - | ✓ | △ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Profile | △ | ✓ | - | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Organization | △ | ✓ | △ | - | ✗ | ✗ | ✗ | ✗ | ✓ | △ |
| ApiKey | ✓ | △ | ✗ | ✓ | - | △ | ✗ | △ | △ | ✗ |
| Dashboard | △ | △ | ✗ | ✓ | ✓ | - | ✓ | △ | △ | △ |
| Credit | △ | △ | ✗ | ✓ | ✓ | △ | - | △ | ✗ | ✗ |
| Contract | △ | △ | ✗ | ✓ | △ | △ | △ | - | ✗ | △ |
| AppModule | △ | △ | ✗ | △ | ✗ | △ | ✗ | ✓ | - | △ |
| AppApiKey | ✓ | △ | ✗ | ✓ | ✗ | △ | △ | △ | ✓ | - |

### 與舊版對照（曾用名與方向修正）

- 程式碼模組為 **`Profile`**，矩陣中不再使用 `User` 欄位名。
- **凍結／恢復 API Key** 的權威方向是 **`Credit` → `ApiKey`**，不是 `ApiKey` → `Credit`。
- **合約政策**方向是 **`AppModule` → `Contract`**；`Contract` 不應反向主導 `AppModule` 的訂閱流程實作。
- **`AppApiKey`** 與 **`ApiKey`** 語意不同；不宜假設 `AppApiKey` 必須依賴 `ApiKey` 模組內部實作（以組織／授權埠為主）。

## 閘道與週邊模組

下列模組在 `src/Modules` 中偏 **交付／閘道／報表**，不與上表做完整 10×10 展開；以「主要依賴」列點即可。

| 模組 | 宜依賴（→） | 備註 |
|------|-------------|------|
| **SdkApi** | `AppApiKey` ✓、`Credit` ✓、`Foundation` △ | SDK HTTP 閘道；不在此複製核心領域規則 |
| **CliApi** | `Auth` ✓ | CLI 裝置流／token 交付；不替代 `Auth` 擁有身分聚合 |
| **Alerts** | `ApiKey` ✓、`Auth` ✓、`Organization` ✓、`Dashboard`（如 `IUsageRepository` 等埠）✓ | 告警與 Webhook；不當成用量或金流權威來源 |
| **DevPortal** | `Organization` ✓、`AppApiKey` ✓、`Auth` △ | 開發者入口的 **Application** 與 `AppModule`（平台模組目錄）語意不同 |
| **Reports** | `Foundation` ✓（郵件、排程） | 報表資料以租戶邊界為主；宜避免依賴其他業務模組內部 |
| **Health** | 僅 `Shared`／基礎檢查 | 維運語意為主，不與業務 context 滲透 |

## 依賴解讀

### Foundation

Foundation 是外部能力入口，不應該反向依賴任何商業模組。

### Auth

- 可與 **`Profile`** 協作：註冊或 OAuth 成功後建立 profile（實務上 Presentation 層可能雙向注入，仍應避免鑽進對方 Domain 實作）。
- 可在授權語境引用 **`Organization`** 的成員／角色結果，但不要把組織不變式搬進 `Auth`。

### Profile

- 管理的是「這個人是誰、偏好是什麼」，**不**擁有密碼、JWT 等憑證生命週期（屬 `Auth`）。
- 可依賴 `Auth` 的後台服務／型別做銜接，但不直接操作 token 儲存細節。

### Organization

- 可查 **`Auth`** 確認使用者存在等。
- 建立組織時可協調 **`AppModule`** 的預設開通（程式碼上存在與 `Contract` 的**模組層協調環**，長期宜以埠或事件收斂；見架構圖文件）。
- 與 `Dashboard`、`Credit`、`Contract`、`AppApiKey` 等：宜透過**穩定識別子、查詢、授權**，不直接操作對方內部狀態。

### ApiKey

- 依賴 **`Organization`** 做租戶／成員語境下的授權校驗。
- 依賴 **`Foundation`**（例如 Bifrost）同步 virtual key。
- **餘額觸發的凍結／恢復**由 **`Credit`** 驅動並呼叫 `ApiKey` 能力，而非 `ApiKey` 主動依賴 `Credit` 模組。

### Dashboard

- 讀模型匯總層：可讀 `ApiKey`、`Credit`、`Organization` 等結果。
- 不應成為主要寫入來源；可對外暴露**穩定讀埠**（例如供 `Alerts` 取用量）。

### Credit

- 依賴 **`ApiKey`**：餘額不足時凍結／恢復 key（經介面，非共用 ORM）。
- 依賴 **`Organization`**：帳戶租戶歸屬與授權。
- 不應直接依賴 **`Profile`** 的內部狀態。

### Contract

- 以 **`Organization`** 為授權與合約語境對象。
- 是**政策來源**，不應混入 `Credit` 的扣款規則或 `ApiKey` 的生命週期實作。
- **`AppModule`** 讀取合約與檢查模組權限；方向為 `AppModule` → `Contract`，而非合約內實作訂閱流程。

### AppModule

- 依賴 **`Contract`** 對齊組織預設開通、模組權限與訂閱邏輯。
- 與 **`Organization`**：訂閱關係圍繞租戶，宜保持單向協調或埠，避免與 `Contract`、`Organization` 形成難以替換的循環（見 `module-dependency-map.md`）。

### AppApiKey

- 依賴 **`Organization`**、`Auth`（授權／成員語境）簽發與管理應用層 key。
- 與 **`AppModule`**：模組綁定與 scope 語意（介面穩定優先）。
- **不**等同於使用者 `ApiKey` 的延伸；不應預設依賴 `ApiKey` 模組內部 model。

## 反向依賴禁區

以下情況通常代表 context 切錯了或耦合過深：

- `Dashboard` 回頭修改 `ApiKey` 或 `Credit` 的權威狀態。
- `Profile` 直接操作 `Auth` 的 token、password 儲存或密碼規則。
- `Contract` 內實作 `AppModule` 的完整訂閱流程（應由 `AppModule` 讀政策並編排）。
- `Credit` 直接讀寫 `ApiKey` 的 ORM entity（應經 repository／應用服務邊界）。
- `AppModule` 直接綁死 `BifrostClient` 等 Foundation 實作細節（應經埠）。
- 在 **`SdkApi`** 內複製或新增核心領域不變式（應留在對應 bounded context）。
- 混淆 **DevPortal 的 Application** 與 **`AppModule`** 的平台模組目錄。

## 判斷規則

如果一條依賴是：

- 穩定識別子傳遞
- 查詢型讀取
- 授權判斷
- 事件驅動副作用

通常可以接受。

如果一條依賴是：

- 直接操作對方內部狀態
- 共用 ORM model
- 共用 repository class
- 共享不穩定的 domain 物件

通常不應接受。

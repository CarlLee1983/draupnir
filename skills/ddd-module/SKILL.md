---
name: ddd-module
description: >
  Draupnir 專案的 DDD（領域驅動設計）模組開發指南。當開發者要在本專案新增模組、
  設計 Domain 層（Entity、Value Object、Repository Interface）、Application 層
  （Use Case Service、DTO）、Infrastructure 層（Repository 實作、mapping）、
  Presentation 層（Controller、Route）、或排查 DDD 設計問題時使用。
  觸發情境：(1) 新增模組、(2) 設計 Entity/Aggregate、(3) 設計 Repository、
  (4) 設計 Application Service、(5) 解決 filter/查詢設計問題、
  (6) 設計 Domain Event 解耦、(7) 設定 DI（ServiceProvider）。
---

# DDD 模組開發指南

本指南基於 Draupnir Auth 模組實作提煉，描述本專案 DDD 四層架構的設計規則與常見陷阱。

## 四層結構一覽

```
src/Modules/<ModuleName>/
├── Domain/
│   ├── Aggregates/        # Aggregate Roots（含 Entity）
│   ├── ValueObjects/      # Value Objects
│   ├── Repositories/      # Repository 介面（Port，不含實作）
│   └── Events/            # Domain Events
├── Application/
│   ├── Services/          # Use Case Services
│   ├── DTOs/              # Request/Response DTOs
│   └── Ports/             # 外部依賴 Interfaces（Email、JWT 等）
├── Infrastructure/
│   ├── Repositories/      # Repository 實作（DB mapping）
│   ├── Services/          # Infrastructure 技術服務
│   └── Providers/         # DI 配置（ServiceProvider）
├── Presentation/
│   ├── Controllers/       # HTTP 請求處理
│   ├── Routes/            # Route 定義
│   ├── Middleware/        # 中介軟體
│   └── Requests/          # Zod 驗證 Schema
└── index.ts               # 公開 API
```

## 核心設計原則

1. **Domain 不知道 DB 細節**：Aggregate 不含 `toDatabaseRow()`、`toDTO()` 等方法
2. **不可變（Immutable）Aggregate**：狀態變更回傳新實例，不修改 props
3. **Value Object 自我驗證**：constructor 丟出錯誤，呼叫方不需要另外驗證
4. **Repository Interface 在 Domain 層定義**：Infrastructure 依賴 Domain，不反過來
5. **Application Service 不做業務邏輯**：協調 Domain Object + Infrastructure，邏輯在 Entity/VO

## 設計各層詳細指引

- **Domain Layer（Entity、VO、Repository Interface）**：見 [references/domain.md](references/domain.md)
- **Application Layer（Service、DTO、Port）**：見 [references/application.md](references/application.md)
- **Infrastructure Layer（Repository 實作、mapping）**：見 [references/infrastructure.md](references/infrastructure.md)
- **Presentation Layer（Controller、Route）**：見 [references/presentation.md](references/presentation.md)
- **DI 配置（ServiceProvider）**：見 [references/di.md](references/di.md)

## 快速決策：Filter 放哪裡？

| 條件類型 | 推薦位置 | 原因 |
|----------|----------|------|
| role、status 等欄位比對 | **SQL WHERE（Repository）** | 減少資料傳輸，支援 DB-level 分頁 |
| keyword 跨表搜尋（需 JOIN 其他 Module） | **Application 記憶體** | 保持 Repository 單純，避免複雜 JOIN |
| 日期範圍、數值範圍 | **SQL WHERE（Repository）** | 可索引，效率高 |
| 計算後欄位（虛擬欄位） | **Application 記憶體** | DB 無此欄位 |

## 常見陷阱

- **陷阱1**：在 Repository Interface 加入 `keyword` 但需要 JOIN 其他 Module → 改為在 Application Service 做記憶體篩選
- **陷阱2**：在 Application Service 做 role/status 的 in-memory filter 而不是推至 DB → 修正為 Repository 的 Filters interface
- **陷阱3**：Aggregate 直接持有 raw string（如 `email: string`）而不是 Value Object → 失去驗證保護
- **陷阱4**：在 Domain Entity 加 `toJSON()` 或 `toPrimitive()` → mapping 邏輯應在 Repository
- **陷阱5**：Infrastructure 的 `mapRole()` 相容舊資料，但邏輯洩漏到 Application → 相容邏輯封裝在 Repository，Application 只看到新 canonical role
- **陷阱6**：Domain Event 定義在 Aggregate 檔案內（local interface）而非 `Domain/Events/` 獨立檔案 → 應獨立成檔，繼承 `@/Shared/Domain/DomainEvent`
- **陷阱7**：Application Service 收集 Aggregate 的 domainEvents 但忘記呼叫 `dispatcher.dispatchAll()` → 事件永遠不會被派發；use case 完成後必須派發
- **陷阱8**：Application Service import Infrastructure Mapper（如 `UserProfileMapper.toDTO()`）→ 應將 `toDTO` 邏輯移至 `Application/DTOs/` 層的 helper 函數

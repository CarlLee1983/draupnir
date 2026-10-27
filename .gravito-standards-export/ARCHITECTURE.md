# Gravito 四層架構指南

這套架構的核心是將「業務知識」與「技術細節」徹底解耦。

## 1. Domain (領域層) - 應用的核心
這是模組最純粹的部分，**不允許依賴任何框架或外部庫**。

- **Entities (實體)**: 具備唯一識別標識的對象。
- **Value Objects (值對象)**: 沒有唯一標識，僅由其屬性定義（如 Email, Money）。
- **Aggregates (聚合)**: 一組相關對象的邊界，確保數據的一致性。
- **Repositories (倉儲接口)**: 定義數據存取的介面 (Ports)，但不實作它。
- **Events (領域事件)**: 當領域內發生重要變動時發出的信號。

> [!IMPORTANT]
> 規則：領域層只能依賴領域層。禁止在這裡使用 `@gravito/core` 以外的框架裝飾器。

## 2. Application (應用層) - 業務流程編排
這一層負責處理使用案例 (Use Cases)。

- **Services (應用服務)**: 協調領域對象執行特定任務。
- **DTOs (數據傳輸對象)**: 定義輸入與輸出的結構，防止領域模型外流到 UI 層。
- **Ports (輸出端口)**: 定義模組需要的外部服務介面（如 MailerPort）。

## 3. Infrastructure (基礎設施層) - 技術實作
這一層處理所有「外部細節」。

- **Repositories Implementation**: 使用 **Atlas ORM** 實作領域層定義的介面。
- **External Clients**: 如 Redis (Plasma) 實作、郵件發送 (Flare) 實作。
- **Adapters**: 將外部數據結構轉化為領域模型。

## 4. Presentation (表現層) - 應用的門面
這一層負責與外部（用戶或系統）溝通。

- **Controllers**: 處理 HTTP 請求、參數校驗（使用 Impulse）。
- **Resources**: 格式化輸出數據。
- **Inertia Pages**: 如果是 Web 應用，這裡定義前端渲染的數據結構。

---

## 數據流向圖 (Data Flow)
`Presentation` -> `Application` -> `Domain` (核心邏輯) -> `Infrastructure` (存儲/外部通訊)

## 依賴方向 (Dependency Rule)
所有層級的依賴都必須指向 **Domain**。Infrastructure 依賴 Domain 定義的介面，而非 Domain 依賴 Infrastructure。

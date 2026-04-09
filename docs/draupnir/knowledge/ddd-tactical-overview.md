# DDD 戰術落地總則

這份文件定義 Draupnir 的 DDD 戰術設計原則。目標不是描述理論，而是讓每個模組都能用同一套方式落地。

## 核心原則

1. 一個模組對應一個明確的 bounded context。
2. Domain 層不依賴 Gravito、HTTP、ORM、Bifrost Client 或任何框架細節。
3. 聚合負責保證不變式，Application Service 負責協調流程。
4. Repository 是 Domain 的 port，實作放在 Infrastructure。
5. Value Object 描述值語意，Entity / Aggregate 描述身份與生命週期。
6. 外部系統整合只能出現在 Application / Infrastructure，不進 Domain。
7. 跨模組協作優先透過 Application Service、Domain Event、ID reference，不直接互相讀寫內部狀態。

## Draupnir 的實作邊界

- `src/Modules/*/Domain`：純領域規則
- `src/Modules/*/Application`：用例流程、授權、交易邊界、協調
- `src/Modules/*/Infrastructure`：Repository、外部 API、事件訂閱、DI 註冊
- `src/Modules/*/Presentation`：HTTP 路由、控制器、輸入驗證
- `src/Shared`：框架無關的共用抽象

## 什麼叫「正確落實」

當你在新增功能時，可以用下面幾個問題自我檢查：

1. 這個規則是不是領域不變式？如果是，應該放進 Aggregate 或 Value Object。
2. 這個流程是不是一個使用情境？如果是，應該放進 Application Service。
3. 這個邏輯是不是可重用的純運算？如果是，才考慮 Domain Service。
4. 這個資料是讀還是寫？如果是寫，應該經過 Repository；如果是讀，先確認是否需要獨立查詢模型。
5. 這個變更會不會碰到外部系統？如果會，放在 Application / Infrastructure，不要污染 Domain。

## 本專案的判斷準則

- 先選邊界，再寫類別。
- 先寫不變式，再寫 CRUD。
- 先讓 Aggregate 能保護狀態，再讓 Repository 持久化。
- 先用 Application Service 表達意圖，再決定 Controller 怎麼接 HTTP。
- 先把跨模組依賴降到最少，再考慮事件或協作流程。


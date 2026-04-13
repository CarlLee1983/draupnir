# Aggregate / Entity / Value Object

這份文件說明 Draupnir 裡三種最常混淆的戰術元件，應該怎麼分工。

## Aggregate

Aggregate 是一致性邊界。

規則：

- Aggregate root 是唯一可被外部直接操作的入口。
- 所有會破壞不變式的狀態變更，都應該由 Aggregate 方法完成。
- 外部不能直接修改 Aggregate 內部成員。
- Aggregate 可以 raise domain events，但不應自己負責 I/O。
- Aggregate 的行為方法應該是「動詞」，不是純 setter。

在本專案裡，`src/Shared/Domain/AggregateRoot.ts` 已經提供事件回放與未提交事件管理，這表示聚合可以採事件驅動狀態模型，但仍要保留一般狀態更新的可讀性。

## Entity

Entity 有身份，且生命週期通常屬於某個 Aggregate。

規則：

- Entity 的相等性由 identity 決定，不是全部欄位。
- Entity 通常代表 Aggregate 內部的子物件，例如訂閱、交易、成員關係。
- 如果一個 Entity 需要獨立存取、獨立查詢、獨立交易邊界，通常表示它可能應該升級成新的 Aggregate。

本專案常見的 Entity 類型：

- `CreditTransaction`
- `OrganizationMember`
- `OrganizationInvitation`
- `WebhookConfig`

## Value Object

Value Object 沒有身份，只由值定義。

規則：

- 不可變。
- 驗證要在建立時完成。
- 相等性看值，不看 reference。
- 若值有合法轉換狀態，轉換規則應該直接封裝在 VO 裡。

在本專案裡，像 `SubscriptionStatus` 這種類型已經把狀態轉換規則包進物件本身，這是正確方向。

## 建構模式

推薦固定使用下面幾種入口：

- `create()`：新建領域物件
- `fromDatabase()`：從持久層還原
- `fromString()` 或同類工廠：從外部輸入建立 VO

如果物件需要更新，優先回傳新物件，而不是大量 mutate。

## 不可變行為方法（Immutable Mutators）

Aggregate 的狀態轉換方法，**應回傳新實例，而不是直接修改 `this`**。
這樣才符合 `coding-style.md` 的不可變原則，且讓測試更容易驗證前後狀態。

```typescript
// 錯誤：直接 mutate
suspend(): void {
  this.props.status = UserStatus.SUSPENDED   // 改壞了 MUTATION
  this.props.updatedAt = new Date()
}

// 正確：回傳新物件
suspend(): User {
  return new User({
    ...this.props,
    status: UserStatus.SUSPENDED,
    updatedAt: new Date(),
  })
}
```

呼叫方必須捕捉回傳值：

```typescript
// 錯誤
user.suspend()
await this.authRepository.save(user)  // user 仍是舊狀態

// 正確
const suspended = user.suspend()
await this.authRepository.save(suspended)
```

唯一例外：`AggregateRoot.addDomainEvent()` 這類內部追蹤輔助方法，不涉及業務狀態，可以 in-place 修改。

## Repository 介面不應繞過 Aggregate

Repository 的方法，**不要為單一欄位開 partial-update 的快捷方法**（例如 `updatePassword(id, hash)`）。
這類方法：

- 繞過 Aggregate 的不變式保護
- 無法觸發 domain event
- 使 `updatedAt` 等追蹤欄位容易脫同步

正確做法：透過 Aggregate 方法修改狀態，再存整個 Aggregate：

```typescript
// 錯誤：繞過 Aggregate
await this.authRepository.updatePassword(userId, hashedPassword)

// 正確：走 Aggregate → 存整體
const updated = user.withPassword(hashedPassword)
await this.authRepository.save(updated)
```

## 跨 Bounded Context 耦合

Application Service **不應直接呼叫另一個 bounded context 的 Repository 或 Aggregate**。
例如 `RegisterUserService` 在完成用戶建立後直接建立 `UserProfile`，
這讓 Auth 模組隱性依賴 Profile 模組的實作細節。

正確做法：透過 Domain Event 解耦。

```typescript
// 錯誤：跨模組直接建立
const profile = UserProfile.createDefault(user.id, email)
await this.userProfileRepository.save(profile)

// 正確：發出 domain event，由各自模組監聽處理
this.eventDispatcher.dispatch(new UserRegistered(user.id, user.emailValue))
```

`UserRegistered` event 定義在 Auth 模組，Profile 模組的 handler 監聽並建立 profile。
兩個模組都不需要知道對方的內部結構。

## 基礎設施依賴應走 Port

Application Service 如果需要使用外部整合（OAuth adapter、外部 API），
應依賴定義在 `Application/Ports/` 的介面，**不要直接 import Infrastructure 的具體類別**。

```typescript
// 錯誤：直接依賴 Infrastructure
import type { GoogleOAuthAdapter } from '../../Infrastructure/Services/GoogleOAuthAdapter'

// 正確：依賴 Application Port
import type { IGoogleOAuthAdapter } from '../Ports/IGoogleOAuthAdapter'
```

Port 介面定義在 Application 層，Infrastructure 實作後在 ServiceProvider 中注入。
這樣 Application Service 可以在測試中輕鬆替換 mock。

## Enum 值的管理原則

Domain 中定義的 Enum 值，**若未被任何業務邏輯使用，應移除而非保留**。
未使用的 enum 值會：

- 讓開發者誤以為某條業務流程已存在
- 在 mapper/switch 中產生 dead branch
- 增加日後修改 schema 的認知負擔

若確實有計畫實作但尚未完成，改用程式碼內的 `// TODO:` 或 issue tracker 記錄意圖，
不要用「先放一個 enum 值」來佔位。

## 常見錯誤

- 把狀態驗證寫在 Controller，讓 Domain 只剩資料容器。
- 用 Entity 當 DTO。
- 讓 Aggregate 直接查 Repository。
- 把所有欄位都做成 public setter。
- 把可獨立生命週期的概念硬塞進既有 Aggregate，造成過大的聚合。
- Aggregate 行為方法直接 mutate `this`，而非回傳新實例（參見「不可變行為方法」）。
- Repository 提供 partial-update 方法繞過 Aggregate（參見「Repository 介面不應繞過 Aggregate」）。
- Application Service 跨 bounded context 直接呼叫外部模組（參見「跨 Bounded Context 耦合」）。
- Application Service 直接 import Infrastructure 具體類別（參見「基礎設施依賴應走 Port」）。


# Setup

`@gravito/impulse` 需要在應用程式啟動時完成一次性初始化，才能讓 `FormRequest` 的驗證系統正常運作。

## 安裝

```bash
npm install @gravito/impulse
# 或
bun add @gravito/impulse
```

## 初始化（必要）

在應用程式入口呼叫，執行一次即可：

```typescript
import { SchemaCache, ZodValidator } from '@gravito/impulse'

SchemaCache.registerValidators([new ZodValidator()])
```

若使用 Valibot：

```typescript
import { SchemaCache, ValibotValidator } from '@gravito/impulse'

SchemaCache.registerValidators([new ValibotValidator()])
```

同時使用兩種驗證器：

```typescript
SchemaCache.registerValidators([new ZodValidator(), new ValibotValidator()])
```

`SchemaCache` 使用 `WeakMap` 快取 schema → validator 的對應，避免重複解析開銷。

## HMR / 開發模式下清除快取

Hot Module Replacement 重載模組後，舊的 FormRequest 實例和 schema 編譯快取可能殘留。呼叫：

```typescript
import { Impulse } from '@gravito/impulse'

Impulse.clearAllCaches()
```

強制重新實例化所有 `FormRequest` 並重新編譯 schema。通常放在 HMR handler 或 dev server hook 中。

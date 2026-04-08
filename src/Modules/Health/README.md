# Health Module

系統健康檢查模組 - 完整的 DDD 實現範例。

## 概述

Health 模組是一個完整的 Domain-Driven Design 實現，展示：

- ✅ Value Objects (HealthStatus)
- ✅ Aggregate Roots (HealthCheck)
- ✅ Domain Services (HealthCheckService)
- ✅ Repository Pattern (IHealthCheckRepository)
- ✅ Application Services (PerformHealthCheckService)
- ✅ DTOs (HealthCheckDTO)
- ✅ Dependency Injection (ServiceProvider)
- ✅ Controllers & Routes
- ✅ 單元測試

## 功能

### API 端點

#### 執行健康檢查
```
GET /health

回應:
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-03-10T10:30:00Z",
  "checks": {
    "database": true,
    "redis": true,
    "cache": true
  },
  "message": "All systems operational"
}

狀態碼:
- 200: 系統健康或降級
- 503: 系統不健康
```

#### 獲取健康檢查歷史
```
GET /health/history?limit=10

參數:
- limit: 記錄數量 (1-100, 預設 10)

回應:
{
  "success": true,
  "data": [
    { /* HealthCheck */ },
    ...
  ],
  "meta": {
    "count": 10,
    "limit": 10
  }
}
```

## 架構結構

```
Health/
├── Domain/
│   ├── ValueObjects/
│   │   └── HealthStatus.ts       # 不可變狀態值物件
│   ├── Aggregates/
│   │   └── HealthCheck.ts        # 聚合根
│   ├── Repositories/
│   │   └── IHealthCheckRepository.ts  # 倒依賴接口
│   └── Services/
│       └── HealthCheckService.ts # 領域服務 (系統檢查)
├── Application/
│   ├── Services/
│   │   └── PerformHealthCheckService.ts  # 使用案例
│   └── DTOs/
│       └── HealthCheckDTO.ts     # 數據傳輸物件
├── Infrastructure/
│   ├── Repositories/
│   │   └── MemoryHealthCheckRepository.ts  # 內存實現
│   └── Providers/
│       └── HealthServiceProvider.ts  # DI 容器配置
├── Presentation/
│   ├── Controllers/
│   │   └── HealthController.ts   # HTTP 處理
│   └── Routes/
│       └── health.routes.ts      # 路由定義
├── index.ts                      # 公開 API
└── README.md
```

## 使用範例

### 從容器獲取服務

```typescript
import type { PlanetCore } from '@gravito/core'
import type { PerformHealthCheckService } from './Application/Services/PerformHealthCheckService'

// 在控制器中
const service = core.container.make('healthCheckService') as PerformHealthCheckService
const result = await service.execute(db, redis, cache)
```

### 執行健康檢查

```typescript
const service = new PerformHealthCheckService(repository)
const check = await service.execute(db, redis, cache)
console.log(check.status)        // "healthy"
console.log(check.checks)        // { database: true, redis: true, cache: true }
```

## 設計模式

### 1. Value Object Pattern
```typescript
// HealthStatus 是不可變的值物件
const healthy = new HealthStatus('healthy')
const unhealthy = new HealthStatus('unhealthy')

healthy.equals(unhealthy)      // false
healthy.isFullyHealthy()       // true
unhealthy.isAvailable()        // false
```

### 2. Aggregate Root Pattern
```typescript
// HealthCheck 是聚合根，負責不變性
const check = HealthCheck.create('check-1', {
  database: true,
  redis: true,
  cache: false
})

check.update(                  // 業務邏輯
  { database: true, redis: false, cache: false },
  'Redis service unavailable'
)
```

### 3. Repository Pattern
```typescript
// 接口定義在 Domain 層
interface IHealthCheckRepository {
  findById(id: string): Promise<HealthCheck | null>
  findLatest(): Promise<HealthCheck | null>
  save(check: HealthCheck): Promise<void>
}

// 實現在 Infrastructure 層
class MemoryHealthCheckRepository implements IHealthCheckRepository {
  // ...
}
```

### 4. Domain Service Pattern
```typescript
// 跨領域聚合根的業務邏輯
class HealthCheckService {
  async checkSystem(db, redis, cache): Promise<SystemChecks> {
    const [dbOk, redisOk, cacheOk] = await Promise.all([
      this.checkDatabase(db),
      this.checkRedis(redis),
      this.checkCache(cache)
    ])
    return { database: dbOk, redis: redisOk, cache: cacheOk }
  }
}
```

### 5. Dependency Injection Pattern
```typescript
// ServiceProvider 負責容器配置
class HealthServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 註冊依賴
    container.singleton('healthRepository', () => new MemoryHealthCheckRepository())
    container.factory('healthCheckService', (c) =>
      new PerformHealthCheckService(c.make('healthRepository'))
    )
  }

  boot(core: PlanetCore): void {
    // 初始化邏輯
    const service = core.container.make('healthCheckService')
    service.execute(...)
  }
}
```

## 擴展

### 使用數據庫實現

```typescript
// 建立 DatabaseHealthCheckRepository
class DatabaseHealthCheckRepository implements IHealthCheckRepository {
  constructor(private db: any) {}

  async findById(id: string): Promise<HealthCheck | null> {
    const row = await this.db.table('health_checks').where('id', id).first()
    return row ? HealthCheck.fromDatabase(row) : null
  }

  async save(check: HealthCheck): Promise<void> {
    await this.db.table('health_checks').insert(check.toDatabaseRow())
  }
  // ...
}

// 在 ServiceProvider 中使用
register(container: Container): void {
  const db = this.app.make('db')
  const repo = new DatabaseHealthCheckRepository(db)
  container.singleton('healthRepository', () => repo)
}
```

### 添加自定義檢查

```typescript
// 擴展 HealthCheckService
class ExtendedHealthCheckService extends HealthCheckService {
  async checkExternalAPI(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { timeout: 5000 })
      return response.ok
    } catch {
      return false
    }
  }

  async checkSystem(db, redis, cache, externalApiUrl): Promise<SystemChecks> {
    const checks = await super.checkSystem(db, redis, cache)
    checks.externalAPI = await this.checkExternalAPI(externalApiUrl)
    return checks
  }
}
```

## 測試

### 運行 Health 模組測試

```bash
# 所有 Health 測試
bun test tests/Unit/Health/

# 特定測試
bun test tests/Unit/Health/HealthStatus.test.ts

# 監視模式
bun test tests/ --watch --filter Health
```

### 測試範例

```typescript
describe('HealthStatus', () => {
  it('should create healthy status', () => {
    const status = new HealthStatus('healthy')
    expect(status.isFullyHealthy()).toBe(true)
  })
})

describe('HealthCheck', () => {
  it('should create and update', () => {
    const check = HealthCheck.create('id', { database: true })
    check.update({ database: false }, 'DB failed')
    expect(check.status.isDegraded()).toBe(true)
  })
})
```

## 最佳實踐

1. ✅ **不可變值物件** - HealthStatus 永遠不變
2. ✅ **聚合根邊界** - HealthCheck 管理一致性
3. ✅ **倒依賴** - Repository 接口在 Domain 層
4. ✅ **Domain Service** - HealthCheckService 處理檢查邏輯
5. ✅ **Application Service** - PerformHealthCheckService 協調層
6. ✅ **DTO 轉換** - 層邊界時轉換
7. ✅ **依賴注入** - ServiceProvider 配置容器
8. ✅ **error handling** - 善雅的錯誤處理

---

**Health 模組是學習完整 DDD 實現的最佳範例。** 🏥

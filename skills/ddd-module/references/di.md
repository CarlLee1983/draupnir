# DI 配置（ServiceProvider）設計指南

## ServiceProvider 結構

```typescript
// Infrastructure/Providers/AuthServiceProvider.ts
export class AuthServiceProvider extends ModuleServiceProvider {

  // register: 宣告 bindings，不執行 boot 邏輯
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    // 1. Repositories（singleton，無狀態）
    container.singleton('authRepository', () => new AuthRepository(db))
    container.singleton('authTokenRepository', () => new AuthTokenRepository(db))

    // 2. Infrastructure Services（singleton，無狀態）
    container.singleton('passwordHasher', () => new ScryptPasswordHasher())
    container.singleton('jwtTokenService', () => new JwtTokenService())

    // 3. Application Services（bind = per-request，可能有 request 狀態）
    container.bind('registerUserService', (c) => new RegisterUserService(
      c.make('authRepository'),
      c.make('passwordHasher'),
    ))

    container.bind('loginUserService', (c) => new LoginUserService(
      c.make('authRepository'),
      c.make('authTokenRepository'),
      c.make('jwtTokenService'),
      c.make('passwordHasher'),
    ))

    // 跨 Module 依賴（profileRepository 由 Profile Module 提供）
    container.bind('listUsersService', (c) => new ListUsersService(
      c.make('authRepository'),
      c.make('profileRepository'),
    ))
  }

  // boot: 執行需要其他 Module 已就緒的初始化（如 Domain Event 訂閱）
  override boot(context: any): void {
    const dispatcher = DomainEventDispatcher.getInstance()
    const handler = new UserRegisteredHandler(context.make('profileRepository'))

    dispatcher.on('auth.user_registered', async (event) => {
      await handler.execute(event.data.userId, event.data.email)
    })
  }
}
```

## singleton vs bind 選擇

| 情境 | 選擇 | 原因 |
|------|------|------|
| Repositories、Hashers、JWT Service | `singleton` | 無狀態，共享一個實例節省資源 |
| Application Services | `bind` | 每次請求可能有不同注入需求，或含 request-scoped 狀態 |
| Middleware、Controller | 視情況 | Controller 通常 singleton；Middleware 依設計 |

## 跨 Module 依賴原則

- **可以**：Module A 的 Service 在 register 時 `c.make('moduleB_repository')`（lazy resolution）
- **禁止**：Module A 直接 `import` Module B 的 Repository 類別並 `new` 它
- **建議**：跨 Module 依賴優先考慮 Domain Event（解耦），其次才是直接注入

## boot vs register

- `register`：宣告 binding，此時其他 Module 可能還未 register → **不要呼叫 `c.make()` 取其他 Module 的服務**
- `boot`：所有 Module 都已 register 完畢 → 安全呼叫 `context.make()` 取任何已宣告的服務

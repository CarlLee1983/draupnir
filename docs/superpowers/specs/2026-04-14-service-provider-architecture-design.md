# ServiceProvider 架構規範設計

**日期：** 2026-04-14  
**狀態：** 已確認，待實作  
**涉及檔案：**
- `src/Shared/Infrastructure/IServiceProvider.ts`（base class 修改）
- `src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter.ts`（驗證解包邏輯）
- `src/Modules/*/Infrastructure/Providers/*ServiceProvider.ts`（全部遷移）

---

## 背景

專案有 15 個模組 ServiceProvider，現況存在以下問題：

| 問題 | 具體表現 |
|------|----------|
| 導覽困難 | `register()` 內 Repository / Infra / Service 混排，不知道去哪找 |
| Wiring 風格不一致 | 部分用 `wireSingleton`，部分用冗長 `container.bind((c) => new X(...))` |
| `registerRoutes()` 不一致 | 部分 inline `new Controller(...as any)`，部分從容器取 |
| `boot()` 型別混亂 | `context as IContainer`、`core?.container ?? core`、`any` 同時存在 |
| 跨模組依賴不可見 | 字串 key `c.make('profileRepository')` 無型別保護 |

**核心痛點：** 進入陌生 ServiceProvider 時，不知道從哪裡找特定的 Repository 或 Service。

---

## 設計目標

1. **任何 ServiceProvider 打開，結構一眼可見** — 固定四層，順序不變
2. **規則由語言強制，而非靠約定** — `register()` 不可 override，`boot()` 無 `any`
3. **Framework adapter 是唯一解包責任方** — module 層永遠只收 `IContainer`

---

## Base Class 設計

```typescript
// src/Shared/Infrastructure/IServiceProvider.ts

export abstract class ModuleServiceProvider {

  /**
   * Sealed：固定呼叫四個 hook，不可 override。
   * 使用 readonly arrow function property，子類無法以 method 覆寫。
   */
  readonly register: (container: IContainer) => void = (container) => {
    this.registerRepositories(container)
    this.registerInfraServices(container)
    this.registerApplicationServices(container)
    this.registerControllers(container)
  }

  /** Layer 1：Repository 實作（infrastructure → domain port 綁定） */
  protected registerRepositories(_container: IContainer): void {}

  /** Layer 2：技術 adapter（JWT / Email / OAuth / Queue 等純技術服務） */
  protected registerInfraServices(_container: IContainer): void {}

  /** Layer 3：Application Services（use-case services） */
  protected registerApplicationServices(_container: IContainer): void {}

  /** Layer 4：Controllers（登記至容器，供 registerRoutes 取用） */
  protected registerControllers(_container: IContainer): void {}

  /**
   * Boot hook：初始化用途（event 訂閱 / warmup / middleware 設定）。
   * 禁止在此做 DI 註冊（container.singleton / container.bind）。
   * 參數型別固定為 IContainer，解包責任在 framework adapter。
   */
  boot(_container: IContainer): void {}
}
```

---

## 強制規則

### `register()` — 不可 override

```
✅ 只透過四個 hook 進行 DI 註冊
❌ 子類不得宣告 register() method（TypeScript 會報錯）
❌ 子類不得重新賦值 this.register（readonly 保護）
```

### `registerRepositories()`

```
✅ container.singleton('xRepository', () => new XRepository(db))
✅ registry.register(...) + container.singleton(...)（Auth 的 ORM 切換模式）
❌ 不得放任何 Service 或 use-case 邏輯
```

### `registerInfraServices()`

```
✅ JWT adapter、Email service、OAuth adapter、Queue client、Webhook dispatcher
✅ 技術層的 singleton（不含 business logic）
❌ 不得放任何 Application Service（use-case）
❌ 不得放任何 business logic
```

### `registerApplicationServices()`

```
✅ wireBind / wireSingleton（適用於純 positional deps）
✅ container.bind((c) => new XService({...}))（適用於 object-bag 或混合 env var）
❌ 不得放 Repository 或 Infra adapter
```

### `registerControllers()`

```
✅ container.bind('xController', (c) => new XController(...deps))
❌ 不得省略此 hook 然後在 registerRoutes() 中 new Controller(...)
```

### `registerRoutes()`

```
✅ const ctrl = context.container.make('xController') as XController
✅ 純路由綁定：registerXRoutes(context.router, ctrl)
❌ 不得 new Controller(...)
❌ 不得 as any
```

### `boot()`

```
✅ DomainEventDispatcher.getInstance().on(...)
✅ configureAuthMiddleware(container.make('authTokenRepository'))
✅ warmup / cache preload
❌ 不得呼叫 container.singleton / container.bind（這是 DI 註冊，屬於 register）
```

---

## Framework Adapter 責任

`GravitoServiceProviderAdapter` 是**唯一**解包 framework context 的地方：

```typescript
// src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter.ts

boot(core: PlanetCore): void {
  // ✅ 解包責任在 adapter，module 層收到的永遠是 IContainer
  const adaptedContainer = new GravitoContainerAdapter(core.container)
  this.moduleProvider.boot(adaptedContainer)
}
```

Module 層永遠不出現：
```typescript
// ❌ 禁止
const container = context as IContainer
const container = core?.container ?? core
```

---

## 遷移範例：AuthServiceProvider

### 改寫前（問題點）

```typescript
override register(container: IContainer): void {
  // Repository、Infra、App Service 全部混排，無分層
  // 尾端還有 side effect：configureAuthMiddleware(...)
}

override boot(context: any): void {
  const container: IContainer = context  // ← module 層自行解包
}
```

### 改寫後

```typescript
export class AuthServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {

  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    const registry = getRegistry()
    registry.register('auth', () => new AuthRepository(db))
    container.singleton('authRepository', () => registry.create('auth', getCurrentORM(), undefined))
    container.singleton('authTokenRepository', () => new AuthTokenRepository(db))
    container.singleton('passwordResetRepository', () => new PasswordResetRepository(db))
    container.singleton('emailVerificationRepository', () => new EmailVerificationRepository(db))
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('passwordHasher', () => new ScryptPasswordHasher())
    container.singleton('jwtTokenService', () => new JwtTokenService())
    container.singleton('googleOAuthAdapter', () => new GoogleOAuthAdapter(
      process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
      process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
      process.env.GOOGLE_OAUTH_REDIRECT_URI ?? 'http://localhost:3000/oauth/google/callback',
    ))
    container.singleton('emailService', (): IEmailService => {
      if (process.env.NODE_ENV === 'production' && process.env.EMAIL_TRANSPORT_CONFIGURED !== 'true') {
        throw new Error('[Auth] Production email transport not configured.')
      }
      return new ConsoleEmailService()
    })
  }

  protected override registerApplicationServices(container: IContainer): void {
    wireBind(container, 'registerUserService', RegisterUserService, ['authRepository', 'passwordHasher'])
    wireBind(container, 'logoutUserService', LogoutUserService, ['authTokenRepository'])
    container.bind('loginUserService', (c) => new LoginUserService(
      c.make('authRepository') as IAuthRepository,
      c.make('authTokenRepository') as IAuthTokenRepository,
      c.make('jwtTokenService') as JwtTokenService,
      c.make('passwordHasher') as ScryptPasswordHasher,
    ))
    // ... 其餘 services
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('authController', (c) => new AuthController(
      c.make('registerUserService') as RegisterUserService,
      c.make('loginUserService') as LoginUserService,
      c.make('refreshTokenService') as RefreshTokenService,
      c.make('logoutUserService') as LogoutUserService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('authController') as AuthController
    void registerAuthRoutes(context.router, controller)
    if (getCurrentORM() === 'memory') {
      registerTestSeedRoutes(context.router, getCurrentDatabaseAccess())
    }
  }

  override boot(container: IContainer): void {
    // Middleware 初始化（不是 DI 註冊）
    configureAuthMiddleware(container.make('authTokenRepository') as IAuthTokenRepository)

    // Event 訂閱
    const profileRepo = container.make('profileRepository') as IUserProfileRepository
    DomainEventDispatcher.getInstance().on('auth.user_registered', async (event) => {
      await new UserRegisteredHandler(profileRepo).execute(
        event.data.userId as string,
        event.data.email as string,
      )
    })
  }
}
```

---

## 遷移範圍

全部 15 個 ServiceProvider 需遷移：

| 模組 | 主要變更 |
|------|----------|
| Auth | 分層 + `boot()` 型別 + `configureAuthMiddleware` 移至 boot |
| Alerts | 已部分使用 wireSingleton，補齊分層 |
| Organization | `registerRoutes()` 移除 `new Controller(...as any)` |
| Profile | `registerRoutes()` 移除 `as any` |
| Credit | `boot()` 移除 `core?.container ?? core` |
| 其餘 10 個 | 統一分層結構 |

---

## 驗收標準

- [ ] `ModuleServiceProvider.register` 為 `readonly` arrow function property
- [ ] `boot()` 簽名為 `boot(_container: IContainer): void`，無 `any`
- [ ] 所有 `boot()` 實作內無 `container.singleton` / `container.bind` 呼叫
- [ ] 所有 `registerRoutes()` 內無 `new Controller(...)` 及 `as any`
- [ ] 所有 `boot()` 實作內無解包邏輯（`context as IContainer` / `core?.container ?? core`）
- [ ] TypeScript build 通過，無新增型別錯誤

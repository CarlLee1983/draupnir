# Presentation Layer 設計指南

## Controller 設計規則

- **只做 HTTP 映射**：取出 validated body → 呼叫 Service → 回傳 JSON
- **不含業務邏輯**：邏輯全在 Application Service
- **使用正確 HTTP Status Code**：201 Created、200 OK、401 Unauthorized、400 Bad Request

```typescript
export class AuthController {
  constructor(
    private registerUserService: RegisterUserService,
    private loginUserService: LoginUserService,
    private listUsersService: ListUsersService,
  ) {}

  async register(ctx: IHttpContext): Promise<Response> {
    const body = ctx.get('validated') as RegisterParams  // Zod 已驗證
    const result = await this.registerUserService.execute(body)
    return ctx.json(result, result.success ? 201 : 400)
  }

  async login(ctx: IHttpContext): Promise<Response> {
    const body = ctx.get('validated') as LoginParams
    const result = await this.loginUserService.execute(body)
    return ctx.json(result, result.success ? 200 : 401)
  }

  async listUsers(ctx: IHttpContext): Promise<Response> {
    const query = ctx.get('validated') as ListUsersParams
    const result = await this.listUsersService.execute(query)
    return ctx.json(result, result.success ? 200 : 400)
  }
}
```

## Request Validation（Zod Schema）

```typescript
// Presentation/Requests/ListUsersRequest.ts
import { z } from 'zod'

export const ListUsersSchema = z.object({
  role:    z.enum(['admin', 'manager', 'member']).optional(),
  status:  z.enum(['active', 'suspended']).optional(),
  keyword: z.string().max(100).optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
})

export type ListUsersParams = z.infer<typeof ListUsersSchema>
```

## Route 配置

```typescript
// Presentation/Routes/auth.routes.ts
export function wireAuthRoutes(app: IApp, container: IContainer): void {
  const controller = new AuthController(
    container.make('registerUserService'),
    container.make('loginUserService'),
    container.make('listUsersService'),
  )

  app.post('/auth/register', validateRequest(RegisterSchema),
           ctx => controller.register(ctx))
  app.post('/auth/login',    validateRequest(LoginSchema),
           ctx => controller.login(ctx))
  app.get('/admin/users',    requireRole('admin'),
           validateRequest(ListUsersSchema, 'query'),
           ctx => controller.listUsers(ctx))
}
```

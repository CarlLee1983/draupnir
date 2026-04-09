// src/Modules/CliApi/Presentation/Controllers/CliApiController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { InitiateDeviceFlowService } from '../../Application/Services/InitiateDeviceFlowService'
import type { AuthorizeDeviceService } from '../../Application/Services/AuthorizeDeviceService'
import type { ExchangeDeviceCodeService } from '../../Application/Services/ExchangeDeviceCodeService'
import type { ProxyCliRequestService } from '../../Application/Services/ProxyCliRequestService'
import type { RevokeCliSessionService } from '../../Application/Services/RevokeCliSessionService'
import { createHash } from 'crypto'

export class CliApiController {
  constructor(
    private readonly initiateService: InitiateDeviceFlowService,
    private readonly authorizeService: AuthorizeDeviceService,
    private readonly exchangeService: ExchangeDeviceCodeService,
    private readonly proxyService: ProxyCliRequestService,
    private readonly revokeService: RevokeCliSessionService,
  ) {}

  /** POST /cli/device-code -- CLI 請求裝置碼（公開端點） */
  async initiateDeviceFlow(ctx: IHttpContext): Promise<Response> {
    const result = await this.initiateService.execute()
    const status = result.success ? 200 : 500
    return ctx.json(result, status)
  }

  /** POST /cli/authorize -- 使用者在瀏覽器端授權（需要登入） */
  async authorizeDevice(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)

    const body = await ctx.getJsonBody<{ userCode?: string }>()
    if (!body.userCode) {
      return ctx.json({ success: false, message: '缺少 userCode', error: 'USER_CODE_REQUIRED' }, 400)
    }

    const result = await this.authorizeService.execute({
      userCode: body.userCode,
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
    })
    const status = result.success ? 200 : result.error === 'INVALID_USER_CODE' ? 404 : 400
    return ctx.json(result, status)
  }

  /** POST /cli/token -- CLI 輪詢換取 token（公開端點） */
  async exchangeToken(ctx: IHttpContext): Promise<Response> {
    const body = await ctx.getJsonBody<{ deviceCode?: string }>()
    if (!body.deviceCode) {
      return ctx.json({ success: false, message: '缺少 deviceCode', error: 'DEVICE_CODE_REQUIRED' }, 400)
    }

    const result = await this.exchangeService.execute({ deviceCode: body.deviceCode })
    if (result.success) return ctx.json(result, 200)
    if (result.error === 'authorization_pending') return ctx.json(result, 428)
    if (result.error === 'expired') return ctx.json(result, 410)
    return ctx.json(result, 400)
  }

  /** POST /cli/proxy -- 轉發 AI 請求（需要 token） */
  async proxyRequest(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)

    const body = await ctx.getJsonBody<{ model?: string; messages?: Array<{ role: string; content: string }> }>()

    const result = await this.proxyService.execute({
      userId: auth.userId,
      body: {
        model: body.model ?? '',
        messages: body.messages ?? [],
      },
    })
    const status = result.success ? 200 : 400
    return ctx.json(result, status)
  }

  /** POST /cli/logout -- 撤銷目前的 CLI session（需要 token） */
  async logout(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)

    const token = this.extractRawToken(ctx)
    if (!token) {
      return ctx.json({ success: false, message: '無法取得 token', error: 'TOKEN_MISSING' }, 400)
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')
    const result = await this.revokeService.execute({
      userId: auth.userId,
      tokenHash,
    })
    return ctx.json(result, result.success ? 200 : 500)
  }

  /** POST /cli/logout-all -- 撤銷所有 CLI session（需要 token） */
  async logoutAll(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)

    const result = await this.revokeService.executeRevokeAll({ userId: auth.userId })
    return ctx.json(result, result.success ? 200 : 500)
  }

  private extractRawToken(ctx: IHttpContext): string | null {
    const header =
      ctx.getHeader('authorization') ??
      ctx.getHeader('Authorization') ??
      ctx.headers?.authorization ??
      ctx.headers?.Authorization
    if (!header) return null
    const parts = header.split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null
    return parts[1]
  }
}

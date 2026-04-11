import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { InitiateDeviceFlowService } from '../../Application/Services/InitiateDeviceFlowService'
import type { AuthorizeDeviceService } from '../../Application/Services/AuthorizeDeviceService'
import type { ExchangeDeviceCodeService } from '../../Application/Services/ExchangeDeviceCodeService'
import type { ProxyCliRequestService } from '../../Application/Services/ProxyCliRequestService'
import type { RevokeCliSessionService } from '../../Application/Services/RevokeCliSessionService'

async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export class CliApiController {
  constructor(
    private readonly initiateService: InitiateDeviceFlowService,
    private readonly authorizeService: AuthorizeDeviceService,
    private readonly exchangeService: ExchangeDeviceCodeService,
    private readonly proxyService: ProxyCliRequestService,
    private readonly revokeService: RevokeCliSessionService,
  ) {}

  async initiateDeviceFlow(ctx: IHttpContext): Promise<Response> {
    const result = await this.initiateService.execute()
    const status = result.success ? 200 : 500
    return ctx.json(result, status)
  }

  async authorizeDevice(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)

    const body = await ctx.getJsonBody<{ userCode?: string }>()
    if (!body.userCode) {
      return ctx.json(
        { success: false, message: 'Missing userCode', error: 'USER_CODE_REQUIRED' },
        422,
      )
    }

    const result = await this.authorizeService.execute({
      userCode: body.userCode,
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
    })
    const status = result.success
      ? 200
      : result.error === 'INVALID_USER_CODE'
        ? 404
        : result.error === 'EXPIRED'
          ? 410
          : 400
    return ctx.json(result, status)
  }

  async exchangeToken(ctx: IHttpContext): Promise<Response> {
    const body = await ctx.getJsonBody<{ deviceCode?: string }>()
    if (!body.deviceCode) {
      return ctx.json(
        { success: false, message: 'Missing deviceCode', error: 'DEVICE_CODE_REQUIRED' },
        422,
      )
    }

    const result = await this.exchangeService.execute({ deviceCode: body.deviceCode })
    if (result.success) return ctx.json(result, 200)
    if (result.error === 'authorization_pending') return ctx.json(result, 428)
    if (result.error === 'expired') return ctx.json(result, 410)
    return ctx.json(result, 400)
  }

  async proxyRequest(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)

    const body = await ctx.getJsonBody<{
      model?: string
      messages?: Array<{ role: string; content: string }>
    }>()

    const result = await this.proxyService.execute({
      userId: auth.userId,
      body: {
        model: body.model ?? '',
        messages: body.messages ?? [],
      },
    })
    const status = result.success ? 200 : 422
    return ctx.json(result, status)
  }

  async logout(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)

    const token = this.extractRawToken(ctx)
    if (!token) {
      return ctx.json({ success: false, message: 'Unable to extract token', error: 'TOKEN_MISSING' }, 400)
    }

    const tokenHash = await sha256(token)
    const result = await this.revokeService.execute({
      userId: auth.userId,
      tokenHash,
    })
    return ctx.json(result, result.success ? 200 : 500)
  }

  async logoutAll(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)

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

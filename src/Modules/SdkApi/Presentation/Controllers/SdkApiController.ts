import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AppAuthMiddleware } from '../../Infrastructure/Middleware/AppAuthMiddleware'
import type { ProxyModelCall } from '../../Application/UseCases/ProxyModelCall'
import type { QueryUsage } from '../../Application/UseCases/QueryUsage'
import type { QueryBalance } from '../../Application/UseCases/QueryBalance'
import type { ProxyCallRequest } from '../../Application/DTOs/SdkApiDTO'

export class SdkApiController {
  constructor(
    private readonly proxyModelCall: ProxyModelCall,
    private readonly queryUsage: QueryUsage,
    private readonly queryBalance: QueryBalance,
  ) {}

  async chatCompletions(ctx: IHttpContext): Promise<Response> {
    const auth = AppAuthMiddleware.getAppAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }

    const body = await ctx.getJsonBody<ProxyCallRequest>()
    const result = await this.proxyModelCall.execute(auth, body)

    if (!result.success) {
      const status =
        result.error === 'INSUFFICIENT_SCOPE'
          ? 403
          : result.error === 'MODULE_NOT_ALLOWED'
            ? 403
            : result.error === 'MISSING_MODEL' || result.error === 'MISSING_MESSAGES'
              ? 400
              : result.error === 'BIFROST_ERROR'
                ? 502
                : 500
      return ctx.json(result, status)
    }

    return ctx.json(result.data, 200)
  }

  async getUsage(ctx: IHttpContext): Promise<Response> {
    const auth = AppAuthMiddleware.getAppAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }

    const options = {
      startDate: ctx.getQuery('start_date'),
      endDate: ctx.getQuery('end_date'),
    }

    const result = await this.queryUsage.execute(auth, options)
    const status = result.success ? 200 : 500
    return ctx.json(result, status)
  }

  async getBalance(ctx: IHttpContext): Promise<Response> {
    const auth = AppAuthMiddleware.getAppAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }

    const result = await this.queryBalance.execute(auth)
    const status = result.success ? 200 : 500
    return ctx.json(result, status)
  }
}

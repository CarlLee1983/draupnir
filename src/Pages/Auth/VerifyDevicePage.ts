import type { AuthorizeDeviceService } from '@/Modules/CliApi/Application/Services/AuthorizeDeviceService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

/**
 * Inertia page: Device Flow authorization form.
 *
 * Allows users to enter a device user code (from CLI) to authorize CLI device access.
 * The POST handler calls AuthorizeDeviceService server-side to validate and approve the device.
 */
export class VerifyDevicePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly authorizeDeviceService: AuthorizeDeviceService,
  ) {}

  /**
   * GET /verify-device: Display the device authorization form.
   *
   * @param ctx - HTTP context
   * @returns Inertia response rendering Auth/VerifyDevice component
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const sharedData = ctx.get('inertia:shared') || {}
    const csrfToken = (sharedData as Record<string, unknown>).csrfToken || ''

    return this.inertia.render(ctx, 'Auth/VerifyDevice', {
      csrfToken: csrfToken as string,
      message: undefined,
      error: undefined,
    })
  }

  /**
   * POST /verify-device: Authorize the device with the provided user code.
   *
   * Validates the authenticated user's identity, reads the validated userCode from the
   * FormRequest context, and delegates to AuthorizeDeviceService to complete the authorization.
   *
   * @param ctx - HTTP context
   * @returns Inertia response with success/error message
   */
  async authorize(ctx: IHttpContext): Promise<Response> {
    const sharedData = ctx.get('inertia:shared') || {}
    const csrfToken = ((sharedData as Record<string, unknown>).csrfToken as string) || ''

    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return this.inertia.render(ctx, 'Auth/VerifyDevice', {
        csrfToken,
        message: undefined,
        error: 'Authentication required',
      })
    }

    const validated = ctx.get('validated') as { userCode?: string } | undefined
    const userCode = validated?.userCode?.trim() ?? ''
    if (!userCode) {
      return this.inertia.render(ctx, 'Auth/VerifyDevice', {
        csrfToken,
        message: undefined,
        error: 'User code is required',
      })
    }

    const result = await this.authorizeDeviceService.execute({
      userCode,
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
    })

    return this.inertia.render(ctx, 'Auth/VerifyDevice', {
      csrfToken,
      message: result.success ? result.message : undefined,
      error: result.success ? undefined : (result.message ?? 'Authorization failed'),
    })
  }
}

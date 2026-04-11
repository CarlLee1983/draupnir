import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

/**
 * Inertia page: Device Flow authorization form.
 *
 * Allows users to enter a device user code (from CLI) to authorize CLI device access.
 * Submits to POST /cli/authorize endpoint which is authenticated via JWT.
 */
export class VerifyDevicePage {
  constructor(private readonly inertia: InertiaService) {}

  /**
   * GET /verify-device: Display the device authorization form.
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
   * POST /verify-device: Re-render with success copy after form handling (client calls /cli/authorize).
   */
  async authorize(ctx: IHttpContext): Promise<Response> {
    const sharedData = ctx.get('inertia:shared') || {}
    const csrfToken = (sharedData as Record<string, unknown>).csrfToken || ''

    return this.inertia.render(ctx, 'Auth/VerifyDevice', {
      csrfToken: csrfToken as string,
      message: 'Device authorization completed. Please return to your CLI.',
      error: undefined,
    })
  }
}

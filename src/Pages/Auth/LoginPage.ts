import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

/**
 * Inertia page: login form and credential authentication.
 */
export class LoginPage {
  constructor(private readonly inertia: InertiaService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    return this.inertia.render(ctx, 'Auth/Login', {
      csrfToken: 'TODO',
      lastEmail: undefined,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    ctx.get('validated') as { email?: string; password?: string } | undefined

    return this.inertia.render(ctx, 'Auth/Login', {
      error: 'Not implemented',
    })
  }
}

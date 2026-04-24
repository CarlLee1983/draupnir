import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { supportedLocales } from './loadMessages'

export class LocaleController {
  /**
   * POST /lang
   * Handles locale switching.
   */
  public async switchLocale(ctx: IHttpContext): Promise<Response> {
    const { locale } = await ctx.getJsonBody<{ locale: string }>()

    if ((supportedLocales as readonly string[]).includes(locale)) {
      ctx.setCookie('draupnir_locale', locale, {
        path: '/',
        maxAge: 31536000, // 1 year
        sameSite: 'Lax',
      })
    }

    const referer = ctx.getHeader('referer') || '/'
    return ctx.redirect(referer, 303)
  }
}

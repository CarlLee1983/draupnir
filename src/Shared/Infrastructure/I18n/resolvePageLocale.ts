import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { type LocaleCode, supportedLocales } from './loadMessages'

/**
 * Resolves the appropriate locale for a page request.
 *
 * Logic order:
 * 1. Check 'draupnir_locale' cookie.
 * 2. Check 'Accept-Language' header.
 * 3. Default to 'zh-TW'.
 *
 * @param ctx - The HTTP context.
 * @returns The resolved LocaleCode.
 */
export function resolvePageLocale(ctx: IHttpContext): LocaleCode {
  const cookieLocale = ctx.getCookie('draupnir_locale')
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  if (supportedLocales.includes(cookieLocale as any)) {
    return cookieLocale as LocaleCode
  }

  const acceptLanguage = ctx.getHeader('accept-language') ?? ctx.getHeader('Accept-Language') ?? ''
  if (acceptLanguage.startsWith('en')) return 'en'
  return 'zh-TW'
}

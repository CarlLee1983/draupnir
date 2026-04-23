import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { type LocaleCode, supportedLocales } from './loadMessages'

export function resolvePageLocale(ctx: IHttpContext): LocaleCode {
  const cookieLocale = ctx.getCookie('draupnir_locale')
  if (supportedLocales.includes(cookieLocale as any)) {
    return cookieLocale as LocaleCode
  }

  const acceptLanguage = ctx.getHeader('accept-language') ?? ctx.getHeader('Accept-Language') ?? ''
  if (acceptLanguage.startsWith('en')) return 'en'
  return 'zh-TW'
}

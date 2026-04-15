import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { LocaleCode } from './loadMessages'

export function resolvePageLocale(ctx: IHttpContext): LocaleCode {
  const acceptLanguage = ctx.getHeader('accept-language') ?? ctx.getHeader('Accept-Language') ?? ''
  if (acceptLanguage.startsWith('en')) return 'en'
  return 'zh-TW'
}

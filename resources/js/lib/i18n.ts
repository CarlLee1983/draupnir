import { useMemo } from 'react'
import { usePage } from '@inertiajs/react'

/**
 * Frontend-side catalog — mirrors the backend zh-TW catalog (canonical key set).
 * Add `ui.*` keys here as pages are migrated to use t() in Phase 3.
 */
const frontendCatalog = {
  'auth.logout.unauthorized': true,
  'auth.logout.missingToken': true,
  'auth.logout.invalidAuthHeader': true,
  'auth.forbidden.adminOnly': true,
  'admin.apiKeys.loadFailed': true,
  'admin.contracts.loadFailed': true,
  'admin.contracts.missingId': true,
  'admin.contracts.validationFailed': true,
  'admin.contracts.createFailed': true,
  'admin.modules.loadFailed': true,
  'admin.modules.nameRequired': true,
  'admin.modules.createFailed': true,
  'admin.organizations.loadFailed': true,
  'admin.organizations.missingId': true,
  'admin.users.loadFailed': true,
  'admin.users.missingId': true,
  'admin.usageSync.notEnabled': true,
  'member.apiKeys.createFailed': true,
  'member.apiKeys.missingOrgId': true,
  'member.apiKeys.selectOrg': true,
  'member.contracts.loadFailed': true,
  'member.contracts.selectOrg': true,
  'member.dashboard.selectOrg': true,
  'member.settings.loadFailed': true,
  'member.usage.loadFailed': true,
  'member.usage.selectOrg': true,
  'sdkApi.unauthorized': true,
} as const

/** Union of all canonical translation keys. zh-TW catalog is the source of truth. */
export type MessageKey = keyof typeof frontendCatalog

/** Full translation map. */
export type Messages = Record<MessageKey, string>

/** Structured translation payload passed over the wire (server → client). */
export interface I18nMessage {
  key: MessageKey
  params?: Record<string, string | number>
}

/** Translator function returned by createTranslator. */
export type Translator = (key: MessageKey, params?: Record<string, string | number>) => string

/**
 * Creates a translator function bound to the given messages map.
 *
 * - Key exists → returns translated value (with param interpolation).
 * - Key missing, dev → console.warn + returns key.
 * - Key missing, production → silently returns key (fallback for resilience only).
 */
export function createTranslator(messages: Partial<Messages>): Translator {
  return function t(key: MessageKey, params?: Record<string, string | number>): string {
    const raw = messages[key]
    const value = raw !== undefined ? raw : key

    if (raw === undefined && process.env.NODE_ENV !== 'production') {
      console.warn(`[i18n] Missing translation key: "${key}"`)
    }

    if (!params) return value

    return value.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))
  }
}

interface PagePropsWithI18n {
  [key: string]: unknown
  messages: Partial<Messages>
  locale: string
}

/**
 * React hook that reads messages and locale from Inertia shared props
 * and returns a memoised translator function.
 */
export function useTranslation(): { t: Translator; locale: string } {
  const { messages, locale } = usePage<PagePropsWithI18n>().props

  const t = useMemo(() => createTranslator(messages ?? {}), [messages])

  return { t, locale }
}

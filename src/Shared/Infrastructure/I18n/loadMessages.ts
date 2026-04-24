import { enMessages } from './locales/en'
import type { MessageKey } from './locales/zh-TW'
import { zhTWMessages } from './locales/zh-TW'

export const supportedLocales = ['zh-TW', 'en'] as const
export type LocaleCode = (typeof supportedLocales)[number]
export type { MessageKey }

const catalogs = {
  'zh-TW': zhTWMessages,
  en: enMessages,
} as const satisfies Record<LocaleCode, Record<MessageKey, string>>

/** Full translation map for a given locale. */
export type Messages = Record<MessageKey, string>

/** Structured translation payload passed over the wire (server → client). */
export interface I18nMessage {
  /** The unique key for the translated message. */
  key: MessageKey
  /** Optional interpolation parameters. */
  params?: Record<string, string | number>
}

/**
 * Loads translation messages for a given locale, optionally with overrides.
 *
 * Returns a Proxy object that falls back to the key itself if a property
 * is missing from the catalog, preventing blank text in the UI.
 *
 * @param locale - The target locale code.
 * @param overrides - Optional map of keys to override or delete.
 * @returns A translation map (Proxy).
 */
export function loadMessages(
  locale: LocaleCode,
  overrides?: Record<string, string | undefined>,
): Record<string, string> {
  const base: Record<string, string> = { ...catalogs[locale] }

  if (!overrides) {
    return new Proxy(base, {
      get(target, prop) {
        if (typeof prop === 'string' && !(prop in target)) return prop
        return Reflect.get(target, prop)
      },
    })
  }

  const result = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete result[key]
    } else {
      result[key] = value
    }
  }

  return new Proxy(result, {
    get(target, prop) {
      if (typeof prop === 'string' && !(prop in target)) return prop
      return Reflect.get(target, prop)
    },
  })
}

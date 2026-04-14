import type { I18nMessage, MessageKey } from '@/Shared/Infrastructure/I18n'

/**
 * Maps a service error code or raw message string to an I18nMessage.
 * Used in page handlers to convert service result errors to structured format.
 *
 * If `codeOrMessage` matches a known error code in ERROR_CODE_MAP, the
 * corresponding MessageKey is used. Otherwise it is cast directly as a MessageKey
 * (handles cases where services already return catalog keys as error codes).
 */
const ERROR_CODE_MAP: Partial<Record<string, MessageKey>> = {
  // Auth
  INVALID_CREDENTIALS: 'auth.login.failed',
  // ApiKey
  NOT_ORG_MEMBER: 'member.apiKeys.loadFailed',
  LABEL_REQUIRED: 'member.apiKeys.createFailed',
  KEY_NOT_FOUND: 'member.apiKeys.createFailed',
}

export function toI18nMessage(
  codeOrMessage: string | null | undefined,
  fallbackKey?: MessageKey,
  params?: Record<string, string | number>,
): I18nMessage {
  if (!codeOrMessage && fallbackKey) {
    return { key: fallbackKey, params }
  }
  const raw = codeOrMessage ?? ''
  const mapped = ERROR_CODE_MAP[raw]
  const key: MessageKey = mapped ?? fallbackKey ?? (raw as MessageKey)
  return { key, params }
}

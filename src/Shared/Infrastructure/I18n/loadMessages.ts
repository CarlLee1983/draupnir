export type LocaleCode = 'zh-TW' | 'en'

export function loadMessages(
  locale: LocaleCode,
  overrides?: Record<string, string | undefined>,
): Record<string, string> {
  const catalog: Record<string, string> =
    locale === 'zh-TW'
      ? { 'member.dashboard.selectOrg': '請先選擇組織' }
      : { 'member.dashboard.selectOrg': 'Please select an organization first' }

  if (!overrides) return catalog

  const result = { ...catalog }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete result[key]
    } else {
      result[key] = value
    }
  }

  // fallback: missing keys return the key itself
  return new Proxy(result, {
    get(target, prop) {
      if (typeof prop === 'string' && !(prop in target)) return prop
      return Reflect.get(target, prop)
    },
  })
}

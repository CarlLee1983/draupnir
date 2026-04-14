export type LocaleCode = 'zh-TW' | 'en'

const zhTW = {
  'auth.logout.unauthorized': '未經授權',
  'auth.logout.missingToken': '缺少 Token',
  'auth.logout.invalidAuthHeader': '無效的 Authorization 格式',
  'auth.forbidden.adminOnly': '需要管理員權限',
  'admin.apiKeys.loadFailed': '讀取 API Key 失敗',
  'admin.contracts.loadFailed': '讀取合約失敗',
  'admin.contracts.missingId': '缺少 contract id',
  'admin.contracts.validationFailed': '請填寫完整欄位（含目標與條款）',
  'admin.contracts.createFailed': '建立失敗',
  'admin.modules.loadFailed': '讀取模組失敗',
  'admin.modules.nameRequired': '模組識別名稱為必填',
  'admin.modules.createFailed': '註冊失敗',
  'admin.organizations.loadFailed': '讀取組織失敗',
  'admin.organizations.missingId': '缺少 org id',
  'admin.users.loadFailed': '讀取使用者失敗',
  'admin.users.missingId': '缺少 user id',
  'admin.usageSync.notEnabled': 'UsageSync 模組尚未啟用（Phase 4 待完成）',
  'member.apiKeys.createFailed': '建立失敗',
  'member.apiKeys.loadFailed': '讀取 API Key 失敗',
  'member.apiKeys.missingOrgId': '缺少 orgId',
  'member.apiKeys.selectOrg': '請先選擇組織',
  'member.alerts.selectOrg': '請先選擇組織',
  'member.contracts.loadFailed': '讀取合約失敗',
  'member.contracts.selectOrg': '請先選擇組織',
  'member.costBreakdown.selectOrg': '請先選擇組織',
  'member.dashboard.selectOrg': '請先選擇組織',
  'member.dashboard.loadFailed': '讀取儀表板資料失敗',
  'member.settings.loadFailed': '讀取設定失敗',
  'member.usage.loadFailed': '讀取用量失敗',
  'member.usage.selectOrg': '請先選擇組織',
  'auth.login.failed': '登入失敗，請確認帳號與密碼',
  'auth.register.success': '帳號建立成功，請登入',
  'sdkApi.unauthorized': '未經授權',
} as const

const catalogs = {
  'zh-TW': zhTW,
  en: {
    'auth.logout.unauthorized': 'Unauthorized',
    'auth.logout.missingToken': 'Missing token',
    'auth.logout.invalidAuthHeader': 'Invalid Authorization header',
    'auth.forbidden.adminOnly': 'Admin access required',
    'admin.apiKeys.loadFailed': 'Failed to load API keys',
    'admin.contracts.loadFailed': 'Failed to load contracts',
    'admin.contracts.missingId': 'Missing contract id',
    'admin.contracts.validationFailed':
      'Please fill in all required fields, including target and terms',
    'admin.contracts.createFailed': 'Create failed',
    'admin.modules.loadFailed': 'Failed to load modules',
    'admin.modules.nameRequired': 'Module identifier is required',
    'admin.modules.createFailed': 'Registration failed',
    'admin.organizations.loadFailed': 'Failed to load organizations',
    'admin.organizations.missingId': 'Missing org id',
    'admin.users.loadFailed': 'Failed to load users',
    'admin.users.missingId': 'Missing user id',
    'admin.usageSync.notEnabled': 'UsageSync is not enabled yet (Phase 4 pending)',
    'member.apiKeys.createFailed': 'Create failed',
    'member.apiKeys.loadFailed': 'Failed to load API keys',
    'member.apiKeys.missingOrgId': 'Missing orgId',
    'member.apiKeys.selectOrg': 'Please select an organization first',
    'member.alerts.selectOrg': 'Please select an organization first',
    'member.contracts.loadFailed': 'Failed to load contracts',
    'member.contracts.selectOrg': 'Please select an organization first',
    'member.costBreakdown.selectOrg': 'Please select an organization first',
    'member.dashboard.selectOrg': 'Please select an organization first',
    'member.dashboard.loadFailed': 'Failed to load dashboard data',
    'member.settings.loadFailed': 'Failed to load settings',
    'member.usage.loadFailed': 'Failed to load usage',
    'member.usage.selectOrg': 'Please select an organization first',
    'auth.login.failed': 'Login failed, please check your credentials',
    'auth.register.success': 'Account created successfully, please log in',
    'sdkApi.unauthorized': 'Unauthorized',
  } satisfies Record<keyof typeof zhTW, string>,
}

/** Union of all canonical translation keys (zh-TW is the source of truth). */
export type MessageKey = keyof typeof zhTW

/** Full translation map for a given locale. */
export type Messages = Record<MessageKey, string>

/** Structured translation payload passed over the wire (server → client). */
export interface I18nMessage {
  key: MessageKey
  params?: Record<string, string | number>
}

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

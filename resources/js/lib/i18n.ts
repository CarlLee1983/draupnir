import { useMemo } from 'react'
import { usePage } from '@inertiajs/react'

/**
 * Frontend-side catalog — mirrors the backend zh-TW catalog (canonical key set).
 * Add `ui.*` keys here as pages are migrated to use t() in Phase 3.
 */
const frontendCatalog = {
  'auth.login.failed': true,
  'auth.logout.invalidAuthHeader': true,
  'auth.logout.missingToken': true,
  'auth.logout.unauthorized': true,
  'auth.forbidden.adminOnly': true,
  'auth.register.success': true,
  'auth.emailVerification.success': true,
  'auth.emailVerification.failed': true,
  'admin.apiKeys.loadFailed': true,
  'admin.contracts.createFailed': true,
  'admin.contracts.loadFailed': true,
  'admin.contracts.missingId': true,
  'admin.contracts.validationFailed': true,
  'admin.modules.createFailed': true,
  'admin.modules.loadFailed': true,
  'admin.modules.nameRequired': true,
  'admin.organizations.loadFailed': true,
  'admin.organizations.missingId': true,
  'admin.users.loadFailed': true,
  'admin.users.missingId': true,
  'admin.usageSync.notEnabled': true,
  'member.alerts.selectOrg': true,
  'member.apiKeys.createFailed': true,
  'member.apiKeys.loadFailed': true,
  'member.apiKeys.missingOrgId': true,
  'member.apiKeys.selectOrg': true,
  'member.apiKeys.budgetIncomplete': true,
  'member.apiKeys.keyNotFound': true,
  'member.apiKeys.budgetPeriodRequired': true,
  'member.apiKeys.budgetUpdateFailed': true,
  'member.apiKeys.keyNotUpdatable': true,
  'member.contracts.loadFailed': true,
  'member.contracts.selectOrg': true,
  'member.costBreakdown.selectOrg': true,
  'member.dashboard.loadFailed': true,
  'member.dashboard.selectOrg': true,
  'member.settings.loadFailed': true,
  'member.usage.loadFailed': true,
  'member.usage.selectOrg': true,
  'manager.members.cannotRemoveSelf': true,
  'manager.apiKeys.createFailed': true,
  'manager.apiKeys.quotaExceedsAvailable': true,
  'sdkApi.unauthorized': true,
  // Common UI
  'ui.common.email': true,
  'ui.common.name': true,
  'ui.common.role': true,
  'ui.common.status': true,
  'ui.common.type': true,
  'ui.common.description': true,
  'ui.common.createdAt': true,
  'ui.common.updatedAt': true,
  'ui.common.joinedAt': true,
  'ui.common.lastUsed': true,
  'ui.common.actions': true,
  'ui.common.view': true,
  'ui.common.edit': true,
  'ui.common.delete': true,
  'ui.common.save': true,
  'ui.common.cancel': true,
  'ui.common.backToList': true,
  'ui.common.loading': true,
  'ui.common.search': true,
  'ui.common.confirmAction': true,
  'ui.common.success': true,
  'ui.common.failed': true,
  'ui.common.status.active': true,
  'ui.common.status.inactive': true,
  'ui.common.status.suspended': true,
  'ui.common.status.draft': true,
  'ui.common.status.expired': true,
  'ui.common.status.terminated': true,
  'ui.common.status.revoked': true,
  'ui.common.status.insufficientCredit': true,
  'ui.common.role.admin': true,
  'ui.common.role.manager': true,
  'ui.common.role.member': true,
  'ui.common.role.user': true,
  'ui.common.org': true,
  'ui.common.totalCount': true,
  'ui.common.noData': true,
  'ui.common.prevPage': true,
  'ui.common.nextPage': true,
  // Auth — Login
  'ui.auth.login.title': true,
  'ui.auth.login.description': true,
  'ui.auth.login.emailLabel': true,
  'ui.auth.login.passwordLabel': true,
  'ui.auth.login.forgotPassword': true,
  'ui.auth.login.submitLoading': true,
  'ui.auth.login.submitButton': true,
  'ui.auth.login.googleButton': true,
  'ui.auth.login.noAccount': true,
  'ui.auth.login.registerLink': true,
  'ui.manager.settings.passwordChangedReauth': true,
  // Auth — Register
  'ui.auth.register.title': true,
  'ui.auth.register.description': true,
  'ui.auth.register.emailLabel': true,
  'ui.auth.register.passwordLabel': true,
  'ui.auth.register.confirmPasswordLabel': true,
  'ui.auth.register.termsCheckbox': true,
  'ui.auth.register.submitLoading': true,
  'ui.auth.register.hasAccount': true,
  'ui.auth.register.loginLink': true,
  'ui.auth.register.passwordMinLength': true,
  'ui.auth.register.passwordUppercase': true,
  'ui.auth.register.passwordLowercase': true,
  'ui.auth.register.passwordNumbers': true,
  'ui.auth.register.passwordSpecial': true,
  // Auth — EmailVerification
  'ui.auth.emailVerification.title': true,
  'ui.auth.emailVerification.successTitle': true,
  'ui.auth.emailVerification.failTitle': true,
  'ui.auth.emailVerification.redirecting': true,
  'ui.auth.emailVerification.backToLogin': true,
  // Auth — VerifyDevice
  'ui.auth.verifyDevice.title': true,
  'ui.auth.verifyDevice.heading': true,
  'ui.auth.verifyDevice.description': true,
  'ui.auth.verifyDevice.codeLabel': true,
  'ui.auth.verifyDevice.codePlaceholder': true,
  'ui.auth.verifyDevice.submitButton': true,
  'ui.auth.verifyDevice.submitLoading': true,
  'ui.auth.verifyDevice.successMessage': true,
  // Auth — ForgotPassword
  'ui.auth.forgotPassword.title': true,
  'ui.auth.forgotPassword.emailLabel': true,
  'ui.auth.forgotPassword.submitButton': true,
  'ui.auth.forgotPassword.backToLogin': true,
  // Auth — ResetPassword
  'ui.auth.resetPassword.title': true,
  'ui.auth.resetPassword.passwordLabel': true,
  'ui.auth.resetPassword.confirmLabel': true,
  'ui.auth.resetPassword.submitButton': true,
  'ui.auth.resetPassword.invalidLink': true,
  'ui.auth.resetPassword.requestNewLink': true,
  'ui.auth.resetPassword.reapply': true,
  // Member — Dashboard
  'ui.member.dashboard.title': true,
  'ui.member.dashboard.subtitle': true,
  'ui.member.dashboard.description': true,
  'ui.member.dashboard.downloadReport': true,
  'ui.member.dashboard.metricCost': true,
  'ui.member.dashboard.metricRequests': true,
  'ui.member.dashboard.metricTokens': true,
  'ui.member.dashboard.metricLatency': true,
  'ui.member.dashboard.balanceTitle': true,
  'ui.member.dashboard.balanceDescription': true,
  'ui.member.dashboard.lowBalance': true,
  'ui.member.dashboard.quickActionsTitle': true,
  'ui.member.dashboard.quickActionsDescription': true,
  'ui.member.dashboard.createApiKey': true,
  'ui.member.dashboard.viewUsage': true,
  'ui.member.dashboard.emptyTitle': true,
  'ui.member.dashboard.emptyDescription': true,
  'ui.member.dashboard.chartCost': true,
  'ui.member.dashboard.chartTokens': true,
  'ui.member.dashboard.chartModelCost': true,
  'ui.member.dashboard.chartModelComp': true,
  // Member — ApiKeys Index
  'ui.member.apiKeys.title': true,
  'ui.member.apiKeys.createButton': true,
  'ui.member.apiKeys.searchPlaceholder': true,
  'ui.member.apiKeys.revokeConfirm': true,
  'ui.member.apiKeys.revokeAction': true,
  'ui.member.apiKeys.budgetMenuItem': true,
  'ui.member.apiKeys.copyKeyAria': true,
  // Member — ApiKeys Create
  'ui.member.apiKeys.create.title': true,
  'ui.member.apiKeys.create.successTitle': true,
  'ui.member.apiKeys.create.copyWarning': true,
  'ui.member.apiKeys.create.savedButton': true,
  'ui.member.apiKeys.create.nameLabel': true,
  'ui.member.apiKeys.create.namePlaceholder': true,
  'ui.member.apiKeys.create.rpmLabel': true,
  'ui.member.apiKeys.create.tpmLabel': true,
  'ui.member.apiKeys.create.submitLoading': true,
  'ui.member.apiKeys.create.submitButton': true,
  'ui.member.apiKeys.create.budgetSectionTitle': true,
  'ui.member.apiKeys.create.budgetSectionHint': true,
  'ui.member.apiKeys.create.budgetCapLabel': true,
  'ui.member.apiKeys.create.budgetCapPlaceholder': true,
  'ui.member.apiKeys.create.budgetPeriodLabel': true,
  'ui.member.apiKeys.create.budgetPeriod7d': true,
  'ui.member.apiKeys.create.budgetPeriod30d': true,
  // Member — ApiKeys Budget
  'ui.member.apiKeys.budget.title': true,
  'ui.member.apiKeys.budget.keyLabel': true,
  'ui.member.apiKeys.budget.cardTitle': true,
  'ui.member.apiKeys.budget.cardDescription': true,
  'ui.member.apiKeys.budget.save': true,
  'ui.member.apiKeys.budget.saving': true,
  // Member — Usage
  'ui.member.usage.title': true,
  'ui.member.usage.heading': true,
  'ui.member.usage.empty': true,
  'ui.member.usage.trendTitle': true,
  'ui.member.usage.totalRequests': true,
  'ui.member.usage.totalTokens': true,
  // Member — Contracts
  'ui.member.contracts.title': true,
  'ui.member.contracts.searchPlaceholder': true,
  // Member — Settings
  'ui.member.settings.title': true,
  'ui.member.settings.heading': true,
  'ui.member.settings.profileCard': true,
  'ui.member.settings.emailLabel': true,
  'ui.member.settings.nameLabel': true,
  'ui.member.settings.roleLabel': true,
  'ui.member.settings.submitLoading': true,
  'ui.member.settings.submitButton': true,
  'ui.member.settings.updateSuccess': true,
  // Member — CostBreakdown
  'ui.member.costBreakdown.title': true,
  'ui.member.costBreakdown.description': true,
  'ui.member.costBreakdown.reportTitle': true,
  'ui.member.costBreakdown.modelDistTitle': true,
  'ui.member.costBreakdown.selectOrgPrompt': true,
  // Member — Alerts
  'ui.member.alerts.title': true,
  'ui.member.alerts.heading': true,
  // Admin — Contracts Index
  'ui.admin.contracts.title': true,
  'ui.admin.contracts.contract': true,
  'ui.admin.contracts.createButton': true,
  'ui.admin.contracts.searchPlaceholder': true,
  'ui.admin.contracts.detailTitle': true,
  'ui.admin.contracts.termsTitle': true,
  'ui.admin.contracts.activePeriod': true,
  'ui.admin.contracts.allowedModules': true,
  'ui.admin.contracts.confirmActivate': true,
  'ui.admin.contracts.confirmTerminate': true,
  'ui.admin.contracts.target': true,
  // Admin — Contracts Create
  'ui.admin.contracts.create.title': true,
  'ui.admin.contracts.create.cardTitle': true,
  'ui.admin.contracts.create.targetTypeLabel': true,
  'ui.admin.contracts.create.targetOrg': true,
  'ui.admin.contracts.create.targetUser': true,
  'ui.admin.contracts.create.targetIdLabel': true,
  'ui.admin.contracts.create.targetIdPlaceholder': true,
  'ui.admin.contracts.create.creditQuotaLabel': true,
  'ui.admin.contracts.create.rpmLabel': true,
  'ui.admin.contracts.create.tpmLabel': true,
  'ui.admin.contracts.create.startDateLabel': true,
  'ui.admin.contracts.create.endDateLabel': true,
  'ui.admin.contracts.create.modulesLabel': true,
  'ui.admin.contracts.create.submitLoading': true,
  'ui.admin.contracts.create.cancelButton': true,
  'ui.admin.contracts.create.validationError': true,
  // Admin — Modules Index
  'ui.admin.modules.title': true,
  'ui.admin.modules.createButton': true,
  'ui.admin.modules.searchPlaceholder': true,
  // Admin — Modules Create
  'ui.admin.modules.create.title': true,
  'ui.admin.modules.create.cardTitle': true,
  'ui.admin.modules.create.nameLabel': true,
  'ui.admin.modules.create.namePlaceholder': true,
  'ui.admin.modules.create.descriptionLabel': true,
  'ui.admin.modules.create.typeLabel': true,
  'ui.admin.modules.create.typeFree': true,
  'ui.admin.modules.create.typePaid': true,
  'ui.admin.modules.create.submitLoading': true,
  'ui.admin.modules.create.cancelButton': true,
  // Admin — Organizations
  'ui.admin.organizations.title': true,
  'ui.admin.organizations.searchPlaceholder': true,
  'ui.admin.organizations.detailTitle': true,
  'ui.admin.organizations.membersTitle': true,
  // Admin — Users
  'ui.admin.users.title': true,
  'ui.admin.users.searchPlaceholder': true,
  'ui.admin.users.detailTitle': true,
  'ui.admin.users.basicInfo': true,
  'ui.admin.users.confirmStatusChange': true,
  // Admin — ApiKeys
  'ui.admin.apiKeys.title': true,
  'ui.admin.apiKeys.selectOrgTitle': true,
  'ui.admin.apiKeys.orgLabel': true,
  'ui.admin.apiKeys.orgPlaceholder': true,
  'ui.admin.apiKeys.ownerLabel': true,
  'ui.admin.apiKeys.searchPlaceholder': true,
  'ui.admin.apiKeys.emptyState': true,
  // Admin — Dashboard
  'ui.admin.dashboard.title': true,
  'ui.admin.dashboard.metricUsers': true,
  'ui.admin.dashboard.metricOrgs': true,
  'ui.admin.dashboard.metricContracts': true,
  'ui.admin.dashboard.metricApiKeys': true,
  'ui.admin.dashboard.usageTrendTitle': true,
  // Admin — UsageSync
  'ui.admin.usageSync.title': true,
  'ui.admin.usageSync.running': true,
  'ui.admin.usageSync.lastSync': true,
  'ui.admin.usageSync.nextSync': true,
  'ui.admin.usageSync.processedCount': true,
  'ui.admin.usageSync.lastError': true,
  // Admin — Reports
  'ui.admin.reports.title': true,
  'ui.admin.reports.scheduleButton': true,
  'ui.admin.reports.formTitleEdit': true,
  'ui.admin.reports.formTitleCreate': true,
  'ui.admin.reports.formDescription': true,
  'ui.admin.reports.frequencyLabel': true,
  'ui.admin.reports.freqWeekly': true,
  'ui.admin.reports.freqMonthly': true,
  'ui.admin.reports.dayOfWeekLabel': true,
  'ui.admin.reports.dayOfMonthLabel': true,
  'ui.admin.reports.monday': true,
  'ui.admin.reports.tuesday': true,
  'ui.admin.reports.wednesday': true,
  'ui.admin.reports.thursday': true,
  'ui.admin.reports.friday': true,
  'ui.admin.reports.saturday': true,
  'ui.admin.reports.sunday': true,
  'ui.admin.reports.dayOfLabel': true,
  'ui.admin.reports.timeLabel': true,
  'ui.admin.reports.timezoneLabel': true,
  'ui.admin.reports.recipientsLabel': true,
  'ui.admin.reports.enableCheckbox': true,
  'ui.admin.reports.updateButton': true,
  'ui.admin.reports.createButton': true,
  'ui.admin.reports.activeSchedulesTitle': true,
  'ui.admin.reports.tableFrequency': true,
  'ui.admin.reports.tableSchedule': true,
  'ui.admin.reports.tableTimezone': true,
  'ui.admin.reports.tableRecipients': true,
  'ui.admin.reports.tableStatus': true,
  'ui.admin.reports.tableActions': true,
  'ui.admin.reports.emptyState': true,
  'ui.admin.reports.statusEnabled': true,
  'ui.admin.reports.statusDisabled': true,
  'ui.admin.reports.timezonePlaceholder': true,
  'ui.admin.reports.timezoneDescription': true,
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

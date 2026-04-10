/**
 * String tokens for `container.make(...)` when resolving admin Inertia page singletons.
 *
 * Each value must have a matching `container.singleton(...)` in `registerAdminPageBindings` and a route
 * row in `registerAdminPageRoutes`.
 */
export const ADMIN_PAGE_KEYS = {
  dashboard: 'page.admin.dashboard',
  users: 'page.admin.users',
  userDetail: 'page.admin.userDetail',
  organizations: 'page.admin.organizations',
  organizationDetail: 'page.admin.organizationDetail',
  contracts: 'page.admin.contracts',
  contractCreate: 'page.admin.contractCreate',
  contractDetail: 'page.admin.contractDetail',
  modules: 'page.admin.modules',
  moduleCreate: 'page.admin.moduleCreate',
  apiKeys: 'page.admin.apiKeys',
  usageSync: 'page.admin.usageSync',
} as const

export type AdminPageBindingKey = (typeof ADMIN_PAGE_KEYS)[keyof typeof ADMIN_PAGE_KEYS]

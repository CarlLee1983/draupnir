/**
 * String tokens for `container.make(...)` when resolving member Inertia page singletons.
 *
 * Each value must have a matching `container.singleton(...)` in `registerMemberPageBindings` and a route
 * row in `registerMemberPageRoutes`.
 */
export const MEMBER_PAGE_KEYS = {
  dashboard: 'page.member.dashboard',
  apiKeys: 'page.member.apiKeys',
  usage: 'page.member.usage',
  costBreakdown: 'page.member.costBreakdown',
  contracts: 'page.member.contracts',
  settings: 'page.member.settings',
  alerts: 'page.member.alerts',
} as const

export type MemberPageBindingKey = (typeof MEMBER_PAGE_KEYS)[keyof typeof MEMBER_PAGE_KEYS]

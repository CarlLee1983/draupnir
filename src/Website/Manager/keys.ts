/**
 * String tokens for `container.make(...)` when resolving manager Inertia page singletons.
 *
 * 每個 value 必須在 registerManagerBindings 註冊 singleton，並在 registerManagerRoutes 被引用。
 */
export const MANAGER_PAGE_KEYS = {
  dashboard: 'page.manager.dashboard',
  organization: 'page.manager.organization',
  members: 'page.manager.members',
  apiKeys: 'page.manager.apiKeys',
  apiKeyCreate: 'page.manager.apiKeyCreate',
  apiKeyRevoke: 'page.manager.apiKeyRevoke',
  settings: 'page.manager.settings',
} as const

export type ManagerPageBindingKey = (typeof MANAGER_PAGE_KEYS)[keyof typeof MANAGER_PAGE_KEYS]

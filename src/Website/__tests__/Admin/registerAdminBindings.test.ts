import { describe, expect, test } from 'bun:test'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { registerAdminBindings } from '@/Website/Admin/bindings/registerAdminBindings'
import { ADMIN_PAGE_KEYS } from '@/Website/Admin/keys'
import { AdminApiKeysPage } from '@/Website/Admin/Pages/AdminApiKeysPage'
import { AdminContractCreatePage } from '@/Website/Admin/Pages/AdminContractCreatePage'
import { AdminContractDetailPage } from '@/Website/Admin/Pages/AdminContractDetailPage'
import { AdminContractsPage } from '@/Website/Admin/Pages/AdminContractsPage'
import { AdminDashboardPage } from '@/Website/Admin/Pages/AdminDashboardPage'
import { AdminModuleCreatePage } from '@/Website/Admin/Pages/AdminModuleCreatePage'
import { AdminModulesPage } from '@/Website/Admin/Pages/AdminModulesPage'
import { AdminOrganizationDetailPage } from '@/Website/Admin/Pages/AdminOrganizationDetailPage'
import { AdminOrganizationsPage } from '@/Website/Admin/Pages/AdminOrganizationsPage'
import { AdminReportsPage } from '@/Website/Admin/Pages/AdminReportsPage'
import { AdminReportTemplatePage } from '@/Website/Admin/Pages/AdminReportTemplatePage'
import { AdminUsageSyncPage } from '@/Website/Admin/Pages/AdminUsageSyncPage'
import { AdminUserDetailPage } from '@/Website/Admin/Pages/AdminUserDetailPage'
import { AdminUsersPage } from '@/Website/Admin/Pages/AdminUsersPage'

function createFakeContainer(): IContainer {
  type Factory = (c: IContainer) => unknown
  const factories = new Map<string, Factory>()
  const cache = new Map<string, unknown>()
  const stub: Record<string, unknown> = {}

  const container: IContainer = {
    singleton(name, factory) {
      factories.set(name, factory)
    },
    bind(name, factory) {
      factories.set(name, factory)
    },
    make(name) {
      if (cache.has(name)) return cache.get(name)
      const factory = factories.get(name)
      const value = factory ? factory(container) : stub
      cache.set(name, value)
      return value
    },
  }
  return container
}

describe('registerAdminBindings', () => {
  test('每個 admin page key 解析為對應的 Page 類別實例', () => {
    const container = createFakeContainer()
    registerAdminBindings(container)

    expect(container.make(ADMIN_PAGE_KEYS.dashboard)).toBeInstanceOf(AdminDashboardPage)
    expect(container.make(ADMIN_PAGE_KEYS.users)).toBeInstanceOf(AdminUsersPage)
    expect(container.make(ADMIN_PAGE_KEYS.userDetail)).toBeInstanceOf(AdminUserDetailPage)
    expect(container.make(ADMIN_PAGE_KEYS.organizations)).toBeInstanceOf(AdminOrganizationsPage)
    expect(container.make(ADMIN_PAGE_KEYS.organizationDetail)).toBeInstanceOf(
      AdminOrganizationDetailPage,
    )
    expect(container.make(ADMIN_PAGE_KEYS.contracts)).toBeInstanceOf(AdminContractsPage)
    expect(container.make(ADMIN_PAGE_KEYS.contractCreate)).toBeInstanceOf(AdminContractCreatePage)
    expect(container.make(ADMIN_PAGE_KEYS.contractDetail)).toBeInstanceOf(AdminContractDetailPage)
    expect(container.make(ADMIN_PAGE_KEYS.modules)).toBeInstanceOf(AdminModulesPage)
    expect(container.make(ADMIN_PAGE_KEYS.moduleCreate)).toBeInstanceOf(AdminModuleCreatePage)
    expect(container.make(ADMIN_PAGE_KEYS.apiKeys)).toBeInstanceOf(AdminApiKeysPage)
    expect(container.make(ADMIN_PAGE_KEYS.usageSync)).toBeInstanceOf(AdminUsageSyncPage)
    expect(container.make(ADMIN_PAGE_KEYS.reports)).toBeInstanceOf(AdminReportsPage)
    expect(container.make(ADMIN_PAGE_KEYS.reportTemplate)).toBeInstanceOf(AdminReportTemplatePage)
  })
})

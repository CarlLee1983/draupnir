import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import type { NavItem } from '@/components/layout/Sidebar'
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Puzzle,
  Key,
  Activity,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const adminNavItems = useMemo(
    (): NavItem[] => [
      { label: t('ui.admin.dashboard.title'), href: '/admin/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: t('ui.admin.users.title'), href: '/admin/users', icon: <Users className="h-4 w-4" /> },
      { label: t('ui.admin.organizations.title'), href: '/admin/organizations', icon: <Building2 className="h-4 w-4" /> },
      { label: t('ui.admin.contracts.title'), href: '/admin/contracts', icon: <FileText className="h-4 w-4" /> },
      { label: t('ui.layout.nav.admin.moduleRegistry'), href: '/admin/modules', icon: <Puzzle className="h-4 w-4" /> },
      { label: t('ui.layout.nav.admin.keysInspect'), href: '/admin/api-keys', icon: <Key className="h-4 w-4" /> },
      { label: t('ui.admin.usageSync.title'), href: '/admin/usage-sync', icon: <Activity className="h-4 w-4" /> },
    ],
    [t],
  )

  return (
    <AppShell sidebarTitle={t('ui.layout.brand.adminShell')} navItems={adminNavItems}>
      {children}
    </AppShell>
  )
}

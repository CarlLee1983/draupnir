import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import type { NavItem } from '@/components/layout/Sidebar'
import { LayoutDashboard, Building2, Users, Key, Settings } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export function ManagerLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const managerNavItems = useMemo(
    (): NavItem[] => [
      { label: t('ui.member.dashboard.title'), href: '/manager/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: t('ui.manager.organization.pageTitle'), href: '/manager/organization', icon: <Building2 className="h-4 w-4" /> },
      { label: t('ui.manager.members.pageTitle'), href: '/manager/members', icon: <Users className="h-4 w-4" /> },
      { label: t('ui.member.apiKeys.title'), href: '/manager/api-keys', icon: <Key className="h-4 w-4" /> },
      { label: t('ui.manager.nav.personalSettings'), href: '/manager/settings', icon: <Settings className="h-4 w-4" /> },
    ],
    [t],
  )

  return (
    <AppShell sidebarTitle={t('ui.layout.brand.managerShell')} navItems={managerNavItems}>
      {children}
    </AppShell>
  )
}

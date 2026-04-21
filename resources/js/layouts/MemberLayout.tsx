import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import type { NavItem } from '@/components/layout/Sidebar'
import { Key, BarChart3, Settings } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export function MemberLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const memberNavItems = useMemo(
    (): NavItem[] => [
      { label: t('ui.member.apiKeys.title'), href: '/member/api-keys', icon: <Key className="h-4 w-4" /> },
      { label: t('ui.member.usage.title'), href: '/member/usage', icon: <BarChart3 className="h-4 w-4" /> },
      { label: t('ui.member.settings.title'), href: '/member/settings', icon: <Settings className="h-4 w-4" /> },
    ],
    [t],
  )

  return (
    <AppShell sidebarTitle={t('ui.layout.brand.memberShell')} navItems={memberNavItems}>
      {children}
    </AppShell>
  )
}

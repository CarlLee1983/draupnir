import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import type { NavItem } from '@/components/layout/Sidebar'
import { LayoutDashboard, Building2, Users, Key, Settings } from 'lucide-react'

const managerNavItems: NavItem[] = [
  { label: '總覽', href: '/manager/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: '組織設定', href: '/manager/organization', icon: <Building2 className="h-4 w-4" /> },
  { label: '成員管理', href: '/manager/members', icon: <Users className="h-4 w-4" /> },
  { label: 'API Keys', href: '/manager/api-keys', icon: <Key className="h-4 w-4" /> },
  { label: '個人設定', href: '/manager/settings', icon: <Settings className="h-4 w-4" /> },
]

export function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell sidebarTitle="Draupnir Manager" navItems={managerNavItems}>
      {children}
    </AppShell>
  )
}

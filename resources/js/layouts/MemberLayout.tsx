import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import type { NavItem } from '@/components/layout/Sidebar'
import { LayoutDashboard, Key, BarChart3, Settings } from 'lucide-react'

const memberNavItems: NavItem[] = [
  { label: 'API Keys', href: '/member/api-keys', icon: <Key className="h-4 w-4" /> },
  { label: '用量', href: '/member/usage', icon: <BarChart3 className="h-4 w-4" /> },
  { label: '設定', href: '/member/settings', icon: <Settings className="h-4 w-4" /> },
]

export function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell sidebarTitle="Draupnir" navItems={memberNavItems}>
      {children}
    </AppShell>
  )
}

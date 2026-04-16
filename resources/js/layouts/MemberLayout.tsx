import type { ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import { AppShell } from '@/components/layout/AppShell'
import type { NavItem } from '@/components/layout/Sidebar'
import { LayoutDashboard, Key, BarChart3, FileText, Settings, PieChart, Bell } from 'lucide-react'

const memberNavItems: NavItem[] = [
  { label: '總覽', href: '/member/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'API Keys', href: '/member/api-keys', icon: <Key className="h-4 w-4" /> },
  { label: '用量', href: '/member/usage', icon: <BarChart3 className="h-4 w-4" /> },
  { label: '成本分析', href: '/member/cost-breakdown', icon: <PieChart className="h-4 w-4" /> },
  { label: '配額', href: '/member/contracts', icon: <FileText className="h-4 w-4" /> },
  { label: '設定', href: '/member/settings', icon: <Settings className="h-4 w-4" /> },
]

export function MemberLayout({ children }: { children: ReactNode }) {
  const page = usePage<{ auth: { user: { role: string } | null } }>()
  const role = page.props.auth.user?.role
  const showAlerts = role === 'manager' || role === 'admin'
  const navItems = showAlerts
    ? [...memberNavItems.slice(0, 4), { label: 'Alerts', href: '/member/alerts', icon: <Bell className="h-4 w-4" /> }, ...memberNavItems.slice(4)]
    : memberNavItems

  return (
    <AppShell sidebarTitle="Draupnir" navItems={navItems}>
      {children}
    </AppShell>
  )
}

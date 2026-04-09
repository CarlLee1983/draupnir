import type { ReactNode } from 'react'
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

const adminNavItems: NavItem[] = [
  { label: '總覽', href: '/admin/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: '使用者', href: '/admin/users', icon: <Users className="h-4 w-4" /> },
  { label: '組織', href: '/admin/organizations', icon: <Building2 className="h-4 w-4" /> },
  { label: '合約', href: '/admin/contracts', icon: <FileText className="h-4 w-4" /> },
  { label: '模組', href: '/admin/modules', icon: <Puzzle className="h-4 w-4" /> },
  { label: 'API Keys', href: '/admin/api-keys', icon: <Key className="h-4 w-4" /> },
  { label: '用量同步', href: '/admin/usage-sync', icon: <Activity className="h-4 w-4" /> },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell sidebarTitle="Draupnir Admin" navItems={adminNavItems}>
      {children}
    </AppShell>
  )
}

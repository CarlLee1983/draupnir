import { useState, type ReactNode } from 'react'
import { Sidebar, type NavItem } from './Sidebar'
import { TopBar } from './TopBar'

interface AppShellProps {
  sidebarTitle: string
  navItems: NavItem[]
  children: ReactNode
}

export function AppShell({ sidebarTitle, navItems, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar
        title={sidebarTitle}
        items={navItems}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col">
        <TopBar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

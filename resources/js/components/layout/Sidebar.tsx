import { Link, usePage } from '@inertiajs/react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface NavItem {
  label: string
  href: string
  icon: ReactNode
}

interface SidebarProps {
  title: string
  items: NavItem[]
  open: boolean
  onClose: () => void
}

export function Sidebar({ title, items, open, onClose }: SidebarProps) {
  const { url } = usePage()

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="text-lg font-semibold text-sidebar-foreground">
            {title}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const isActive = url.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

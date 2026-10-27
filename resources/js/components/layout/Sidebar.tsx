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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar/80 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-lg">D</span>
            </div>
            <span className="text-xl font-heading font-bold tracking-tight text-sidebar-foreground">
              {title}
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1.5 p-4">
          {items.map((item) => {
            const isActive = url.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
              >
                <span className={cn(
                  'transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'text-primary-foreground' : 'text-sidebar-foreground/50 group-hover:text-primary'
                )}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

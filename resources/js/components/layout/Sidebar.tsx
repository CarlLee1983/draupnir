import { Link, usePage } from '@inertiajs/react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { useTranslation } from '@/lib/i18n'

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
  const { t } = useTranslation()

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-label={t('ui.layout.sidebar.closeOverlay')}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label={t('ui.layout.sidebar.ariaNav')}
      >
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/" className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
            {title}
          </Link>
        </div>

        <nav aria-label={t('ui.layout.sidebar.ariaNav')} className="flex-1 space-y-0.5 py-4">
          {items.map((item) => {
            const isActive = item.href === '/member/dashboard'
              ? url === '/member/dashboard'
              : url.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors',
                  isActive
                    ? 'border-l-2 border-primary bg-primary/5 text-primary'
                    : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                )}
              >
                <span className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/70')}>
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

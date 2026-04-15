import { Link } from '@inertiajs/react'
import { useAuth } from '@/hooks/use-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopBarProps {
  onToggleSidebar: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const { user } = useAuth()

  const getInitials = (email: string, name?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/).filter(Boolean)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return parts[0].slice(0, 2).toUpperCase()
    }
    const localPart = email.split('@')[0]
    return localPart.slice(0, 2).toUpperCase()
  }

  const initials = user ? getInitials(user.email, (user as any).name) : '??'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label="開啟側邊選單"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/" className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
          Draupnir
        </Link>
      </div>

      <div className="hidden flex-1 lg:block" />
      <div className="flex-1 lg:hidden" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-none border border-border bg-muted/30"
            aria-label="使用者選單"
          >
            <Avatar className="h-8 w-8 rounded-none">
              <AvatarFallback className="rounded-none bg-transparent font-mono text-[11px]">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-none border-border bg-background font-mono text-[11px] uppercase tracking-widest">
          {user && (
            <>
              <div className="px-2 py-2 text-[10px] lowercase tracking-normal text-muted-foreground">{user.email}</div>
              <DropdownMenuSeparator className="bg-border" />
            </>
          )}
          <DropdownMenuItem asChild className="cursor-pointer focus:bg-primary focus:text-primary-foreground">
            <Link href="/member/settings" className="flex w-full items-center px-2 py-1.5">
              設定
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem asChild className="cursor-pointer focus:bg-destructive focus:text-destructive-foreground">
            <Link href="/logout" method="post" as="button" className="flex w-full items-center px-2 py-1.5">
              登出
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

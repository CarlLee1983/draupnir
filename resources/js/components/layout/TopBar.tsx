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

  const initials = user ? user.email.slice(0, 2).toUpperCase() : '??'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/60 backdrop-blur-md px-4 sm:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground hover:text-primary transition-colors" onClick={onToggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="group relative flex items-center gap-3 px-2 h-10 rounded-full hover:bg-muted/50 transition-all">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-xs font-semibold text-foreground leading-none">{user?.email.split('@')[0]}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Admin</span>
              </div>
              <Avatar className="h-9 w-9 border-2 border-primary/20 group-hover:border-primary transition-all shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 p-2 rounded-xl shadow-xl border-border/50 backdrop-blur-xl">
            {user && (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">帳戶訊息</p>
                  <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="my-1 opacity-50" />
              </>
            )}
            <DropdownMenuItem asChild className="rounded-lg focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer py-2">
              <Link href="/member/settings">設定</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 opacity-50" />
            <DropdownMenuItem asChild className="rounded-lg focus:bg-destructive/10 focus:text-destructive transition-colors cursor-pointer py-2">
              <Link href="/logout" method="post" as="button" className="w-full text-left">
                登出
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

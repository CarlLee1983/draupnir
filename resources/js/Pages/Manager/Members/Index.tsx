import { useState } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { useUser } from '@/hooks/use-auth'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/lib/i18n'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, UserPlus, Mail, Clock, Shield, Trash2, User, Key as KeyIcon, AlertCircle } from 'lucide-react'
import type { SharedProps } from '@/types/inertia'

interface MemberRow {
  userId: string
  email: string
  role: string
  joinedAt: string
  assignedKeys: string[]
}

interface PendingInvitationRow {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
}

interface Props {
  members: MemberRow[]
  pendingInvitations: PendingInvitationRow[]
  error: { key: string } | null
  invitationsError: { key: string } | null
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function getInitials(email: string): string {
  if (!email) return 'U'
  return email.substring(0, 2).toUpperCase()
}

export default function ManagerMembersIndex({
  members,
  pendingInvitations,
  error,
  invitationsError,
}: Props) {
  const { t } = useTranslation()
  const { flash } = usePage().props as unknown as SharedProps
  const currentUser = useUser()
  const [email, setEmail] = useState('')
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  const invite = (e: React.FormEvent) => {
    e.preventDefault()
    router.post(
      '/manager/members/invite',
      { email, role: 'member' },
      { 
        onSuccess: () => {
          setEmail('')
          setIsInviteDialogOpen(false)
        } 
      },
    )
  }
  const remove = (userId: string) => {
    if (userId === currentUser.id) return
    if (!confirm(t('ui.manager.members.removeConfirm'))) return
    router.post(`/manager/members/${userId}/remove`)
  }

  return (
    <ManagerLayout>
      <Head title={t('ui.manager.members.headTitle')} />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('ui.manager.members.pageTitle')}</h1>
            <p className="text-muted-foreground mt-1">{t('ui.manager.members.pageDescription')}</p>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 shadow-sm transition-all active:scale-95">
                <UserPlus className="h-4 w-4" />
                {t('ui.manager.members.inviteMember')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={invite}>
                <DialogHeader>
                  <DialogTitle className="text-xl">{t('ui.manager.members.inviteDialogTitle')}</DialogTitle>
                  <DialogDescription className="pt-2 text-base">
                    {t('ui.manager.members.inviteDialogDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-foreground">
                      {t('ui.manager.members.emailLabel')}
                    </label>
                    <Input
                      id="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      type="email"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">{t('ui.manager.members.defaultRoleHint')}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full sm:w-auto h-11 px-8">
                    {t('ui.manager.members.sendInvite')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {flash?.error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 text-red-700 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div className="flex-1 text-sm font-medium">
              {t(flash.error.key, flash.error.params)}
            </div>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="shadow-sm border-muted/60 overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('ui.manager.members.cardCurrentMembers')}
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{members.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('ui.manager.members.joinedCountHint')}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-muted/60 overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/20 group-hover:bg-amber-500 transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('ui.manager.members.cardPendingInvites')}
              </CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Mail className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{pendingInvitations.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('ui.manager.members.pendingCountHint')}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-3 border-b border-muted/40">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>{t('ui.manager.members.memberListTitle')}</CardTitle>
            </div>
            <CardDescription>{t('ui.manager.members.memberListDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-muted/40">
                  <TableHead className="w-[350px] font-bold">{t('ui.manager.members.colMemberInfo')}</TableHead>
                  <TableHead className="font-bold">{t('ui.manager.members.colRole')}</TableHead>
                  <TableHead className="font-bold text-center">{t('ui.manager.members.colApiKeys')}</TableHead>
                  <TableHead className="font-bold">{t('ui.manager.members.colJoinedAt')}</TableHead>
                  <TableHead className="text-right font-bold pr-6">{t('ui.manager.members.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <User className="h-8 w-8 opacity-20" />
                        <p>{t('ui.manager.members.emptyMembers')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => (
                    <TableRow key={m.userId} className="hover:bg-muted/10 border-muted/40 group">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarFallback className="bg-primary/5 text-primary font-bold">
                              {getInitials(m.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-base truncate">
                              {m.email || t('ui.manager.members.unnamedUser')}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono truncate opacity-60 group-hover:opacity-100 transition-opacity">
                              {m.userId}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={m.role === 'manager' ? 'default' : 'secondary'}
                          className="px-3 py-0.5 rounded-md font-medium capitalize shadow-sm"
                        >
                          {m.role === 'manager'
                            ? t('ui.manager.members.roleManager')
                            : t('ui.manager.members.roleMember')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          {m.assignedKeys.length === 0 ? (
                            <Badge variant="outline" className="text-muted-foreground border-dashed px-3">0</Badge>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-primary/5 hover:text-primary gap-1.5">
                                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                                    {m.assignedKeys.length}
                                  </Badge>
                                  <span className="text-xs font-medium">{t('ui.manager.members.keysShort')}</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{t('ui.manager.members.assignedKeysTitle')}</DialogTitle>
                                  <DialogDescription>
                                    {t('ui.manager.members.assignedKeysDescription', { email: m.email })}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 py-2">
                                  {m.assignedKeys.map((key) => (
                                    <div key={key} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                      <div className="p-2 bg-background rounded border">
                                        <KeyIcon className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <span className="font-medium">{key}</span>
                                    </div>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3.5 w-3.5 opacity-60" />
                          {m.joinedAt}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {m.userId === currentUser.id ? (
                          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
                            {t('ui.manager.members.badgeYou')}
                          </Badge>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-muted transition-colors">
                                <span className="sr-only">{t('ui.manager.members.srOpenMenu')}</span>
                                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>{t('ui.manager.members.dropdownLabel')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
                                onClick={() => remove(m.userId)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('ui.manager.members.removeMember')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <CardHeader className="pb-3 border-b border-muted/40 bg-muted/5">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-500" />
              <CardTitle>{t('ui.manager.members.pendingSectionTitle')}</CardTitle>
            </div>
            <CardDescription>{t('ui.manager.members.pendingSectionDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {invitationsError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="p-3 bg-red-50 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('ui.manager.members.invitesLoadFailedTitle')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('ui.manager.members.invitesLoadFailedHint')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.reload()} className="h-9">
                  {t('ui.manager.members.refresh')}
                </Button>
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <Mail className="h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">{t('ui.manager.members.noPendingInvites')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-muted/40">
                    <TableHead className="font-bold">{t('ui.common.email')}</TableHead>
                    <TableHead className="font-bold">{t('ui.manager.members.colRole')}</TableHead>
                    <TableHead className="font-bold">{t('ui.manager.members.colCreatedAt')}</TableHead>
                    <TableHead className="font-bold text-right pr-6">
                      {t('ui.manager.members.colExpiresAt')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-muted/10 border-muted/40">
                      <TableCell className="font-semibold py-4 pl-6">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="px-3 py-0.5 rounded-md font-medium">
                          {inv.role === 'manager'
                            ? t('ui.manager.members.roleManager')
                            : t('ui.manager.members.roleMember')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-medium">
                        {formatDateTime(inv.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge variant="outline" className="bg-amber-50/50 text-amber-700 border-amber-200/60 font-medium">
                          <Clock className="h-3 w-3 mr-1.5" />
                          {formatDateTime(inv.expiresAt)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t('ui.manager.members.loadFailedBanner')}
          </div>
        )}
      </div>
    </ManagerLayout>
  )
}

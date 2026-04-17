import { useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Key, 
  MoreHorizontal, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  UserCircle, 
  AlertCircle,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import type { SharedProps } from '@/types/inertia'

interface KeyRow {
  id: string
  label: string
  /** Bifrost API secret（DB: `bifrost_key_value`）；供 Gateway LLM 請求 Authorization 使用 */
  gatewayKeyValue: string | null
  quotaAllocated: number
  status: string
  assignedMemberId: string | null
}
interface Assignee {
  userId: string
  email: string
}
interface Props {
  keys: KeyRow[]
  assignees: Assignee[]
  error: { key: string } | null
}

export default function ManagerApiKeysIndex({ keys, assignees, error }: Props) {
  const { t } = useTranslation()
  const { flash } = usePage().props as unknown as SharedProps
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const revoke = (id: string) => {
    if (!confirm('撤銷後此 key 將失效，確定執行？')) return
    router.post(`/manager/api-keys/${id}/revoke`)
  }

  const onAssignChange = (keyId: string, value: string) => {
    const assigneeUserId = value === '' ? null : value
    router.post(`/manager/api-keys/${keyId}/assign`, { assigneeUserId })
  }

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <ManagerLayout>
      <Head title="API Keys" />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
            <p className="text-muted-foreground mt-1">
              管理供成員呼叫 LLM Gateway 使用的 API 金鑰。
            </p>
          </div>
          <Link href="/manager/api-keys/create">
            <Button size="lg" className="gap-2 shadow-sm transition-all active:scale-95">
              <Plus className="h-4 w-4" />
              建立 Key
            </Button>
          </Link>
        </div>

        {flash?.error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 text-red-700 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div className="flex-1 text-sm font-medium">
              {t(flash.error.key, flash.error.params)}
            </div>
          </div>
        )}

        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-3 border-b border-muted/40">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>金鑰清單</CardTitle>
            </div>
            <CardDescription>
              每個 Key 都可以獨立設定配額重置週期並指派給特定成員。
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-muted/40">
                  <TableHead className="w-[200px] font-bold">名稱</TableHead>
                  <TableHead className="font-bold">Gateway API Key</TableHead>
                  <TableHead className="font-bold text-right">配額</TableHead>
                  <TableHead className="font-bold">狀態</TableHead>
                  <TableHead className="font-bold">指派對象</TableHead>
                  <TableHead className="text-right font-bold pr-6">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Key className="h-8 w-8 opacity-20" />
                        <p>目前尚無 API Key。</p>
                        <Link href="/manager/api-keys/create">
                          <Button variant="link" className="text-primary">立即建立第一個 Key</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.map((k) => (
                    <TableRow key={k.id} className="hover:bg-muted/10 border-muted/40 group">
                      <TableCell className="font-semibold py-4">{k.label}</TableCell>
                      <TableCell>
                        {k.gatewayKeyValue ? (
                          <div className="flex items-center gap-2 group/key">
                            <code className="px-2 py-1 bg-muted rounded text-xs font-mono max-w-[12rem] truncate">
                              {k.gatewayKeyValue}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover/key:opacity-100 transition-opacity"
                              onClick={() => copyToClipboard(k.id, k.gatewayKeyValue!)}
                            >
                              {copiedId === k.id ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">隱藏</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {k.quotaAllocated.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={k.status === 'active' ? 'default' : 'secondary'}
                          className={`gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm ${
                            k.status === 'active' ? 'bg-green-500/10 text-green-700 border-green-200/50 hover:bg-green-500/20' : ''
                          }`}
                        >
                          {k.status === 'active' ? (
                            <>
                              <ShieldCheck className="h-3 w-3" />
                              使用中
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-3 w-3" />
                              已撤銷
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-muted-foreground/60" />
                          <select
                            className="text-sm bg-transparent border-none focus:ring-0 focus:outline-none cursor-pointer hover:underline underline-offset-4 decoration-muted-foreground/30"
                            value={k.assignedMemberId ?? ''}
                            onChange={(e) => onAssignChange(k.id, e.target.value)}
                            disabled={k.status === 'revoked'}
                          >
                            <option value="">未指派</option>
                            {assignees.map((a) => (
                              <option key={a.userId} value={a.userId}>
                                {a.email || a.userId}
                              </option>
                            ))}
                          </select>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-muted transition-colors">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>管理操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
                              onClick={() => revoke(k.id)}
                              disabled={k.status === 'revoked'}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              撤銷 Key
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            金鑰載入失敗，請確認您的權限或網路連線。
          </div>
        )}
      </div>
    </ManagerLayout>
  )
}

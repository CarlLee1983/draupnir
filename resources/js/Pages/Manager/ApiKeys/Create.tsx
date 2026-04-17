import { useState } from 'react'
import { Head, router, usePage, Link } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/lib/i18n'
import { 
  ArrowLeft, 
  Key, 
  Check, 
  Copy, 
  AlertCircle, 
  HelpCircle,
  Calendar,
  UserPlus,
  ShieldCheck
} from 'lucide-react'
import type { SharedProps } from '@/types/inertia'

interface Assignee {
  userId: string
  email: string
}
interface Props {
  assignees: Assignee[]
  newKeyValue?: string
  contractQuota: number | null
  totalAllocated: number | null
}

export default function ManagerApiKeyCreate({ assignees, newKeyValue, contractQuota, totalAllocated }: Props) {
  const { t } = useTranslation()
  const { flash } = usePage().props as unknown as SharedProps
  const [label, setLabel] = useState('')
  const [quota, setQuota] = useState<number | ''>('')
  const [period, setPeriod] = useState<'7d' | '30d'>('30d')
  const [assignee, setAssignee] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const copyKey = () => {
    if (!newKeyValue) return
    navigator.clipboard.writeText(newKeyValue).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    router.post('/manager/api-keys', {
      label,
      ...(quota !== ''
        ? { quotaAllocated: Number(quota), budgetResetPeriod: period }
        : {}),
      assigneeUserId: assignee === '' ? null : assignee,
    })
  }

  return (
    <ManagerLayout>
      <Head title="建立 API Key" />
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <Link href="/manager/api-keys" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          返回列表
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">建立 API Key</h1>
          <p className="text-muted-foreground">
            建立一組新的金鑰並設定其配額限制。
          </p>
        </div>

        {newKeyValue && (
          <Card className="border-green-200 bg-green-50/30 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4 bg-green-500/10 border-b border-green-200 flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-full">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-800">API Key 建立成功！</p>
                <p className="text-xs text-green-700/80">請立即複製並妥善保存，離開此頁面後將無法再次查看完整的 Key 值。</p>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 p-4 bg-background border-2 border-green-200 rounded-xl shadow-sm">
                <code className="flex-1 text-sm font-mono break-all select-all font-semibold">
                  {newKeyValue}
                </code>
                <Button
                  type="button"
                  variant={copied ? "default" : "outline"}
                  size="sm"
                  onClick={copyKey}
                  className={`shrink-0 gap-2 transition-all ${copied ? 'bg-green-600 hover:bg-green-700 border-none' : ''}`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      已複製
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      複製
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {flash?.error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-start gap-3 animate-in shake-in-1">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div className="flex-1 text-sm font-medium">
              {t(flash.error.key, flash.error.params)}
            </div>
          </div>
        )}

        <Card className="shadow-lg border-muted/60">
          <form onSubmit={submit}>
            <CardHeader>
              <CardTitle>金鑰設定</CardTitle>
              <CardDescription>設定金鑰的識別名稱與使用限制。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="label" className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  Key 名稱
                </Label>
                <Input
                  id="label"
                  placeholder="例如: 開發用 Key, 前端專案..."
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">這僅用於內部識別。</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quota" className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    配額上限
                  </Label>
                  <Input
                    id="quota"
                    type="number"
                    min={0}
                    max={contractQuota != null && totalAllocated != null ? contractQuota - totalAllocated : undefined}
                    placeholder="不限"
                    value={quota}
                    onChange={(e) => setQuota(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" />
                    {contractQuota != null && totalAllocated != null
                      ? `合約配額 ${contractQuota.toLocaleString()}，已分配 ${totalAllocated.toLocaleString()}，可用 ${(contractQuota - totalAllocated).toLocaleString()}`
                      : '單位依 Gateway 設定而定'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    重置週期
                  </Label>
                  <div className="relative">
                    <select
                      id="period"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as '7d' | '30d')}
                    >
                      <option value="7d">每 7 天重置</option>
                      <option value="30d">每 30 天重置</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-muted/40">
                <Label htmlFor="assignee" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  指派給成員 (選填)
                </Label>
                <div className="relative">
                  <select
                    id="assignee"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">未指派</option>
                    {assignees.map((a) => (
                      <option key={a.userId} value={a.userId}>
                        {a.email || a.userId}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">指派後，該成員即可在他們的 Dashboard 中看到此 Key。</p>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t border-muted/40 px-6 py-4 flex justify-between items-center">
              <Button type="button" variant="ghost" onClick={() => window.history.back()}>取消</Button>
              <Button type="submit" className="px-8 shadow-sm">
                確認建立
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </ManagerLayout>
  )
}

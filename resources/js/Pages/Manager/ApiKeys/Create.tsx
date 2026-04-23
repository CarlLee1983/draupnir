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
    const withBudget =
      typeof quota === 'number' && Number.isFinite(quota) && quota > 0
    router.post('/manager/api-keys', {
      label,
      ...(withBudget
        ? { quotaAllocated: quota, budgetResetPeriod: period }
        : {}),
      assigneeUserId: assignee === '' ? null : assignee,
    })
  }

  const quotaHint =
    contractQuota != null && totalAllocated != null
      ? t('ui.manager.apiKeys.createPage.quotaHintWithContract', {
          contract: contractQuota.toLocaleString(),
          allocated: totalAllocated.toLocaleString(),
          available: (contractQuota - totalAllocated).toLocaleString(),
        })
      : t('ui.manager.apiKeys.createPage.quotaHintGeneric')

  return (
    <ManagerLayout>
      <Head title={t('ui.manager.apiKeys.createPage.headTitle')} />
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <Link href="/manager/api-keys" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          {t('ui.manager.apiKeys.createPage.backToList')}
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('ui.manager.apiKeys.createPage.pageTitle')}</h1>
          <p className="text-muted-foreground">{t('ui.manager.apiKeys.createPage.pageDescription')}</p>
        </div>

        {newKeyValue && (
          <Card className="border-green-200 bg-green-50/30 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4 bg-green-500/10 border-b border-green-200 flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-full">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-800">{t('ui.manager.apiKeys.createPage.successTitle')}</p>
                <p className="text-xs text-green-700/80">{t('ui.manager.apiKeys.createPage.successHint')}</p>
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
                      {t('ui.manager.apiKeys.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      {t('ui.manager.apiKeys.copy')}
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
              <CardTitle>{t('ui.manager.apiKeys.createPage.cardTitle')}</CardTitle>
              <CardDescription>{t('ui.manager.apiKeys.createPage.cardDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="label" className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  {t('ui.manager.apiKeys.createPage.keyNameLabel')}
                </Label>
                <Input
                  id="label"
                  placeholder={t('ui.manager.apiKeys.createPage.keyNamePlaceholder')}
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">{t('ui.manager.apiKeys.createPage.keyNameHint')}</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quota" className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    {t('ui.manager.apiKeys.createPage.quotaLabel')}
                  </Label>
                  <Input
                    id="quota"
                    type="number"
                    min={0}
                    max={contractQuota != null && totalAllocated != null ? contractQuota - totalAllocated : undefined}
                    placeholder={t('ui.manager.apiKeys.createPage.quotaUnlimitedPlaceholder')}
                    value={quota}
                    onChange={(e) => setQuota(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" />
                    {quotaHint}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {t('ui.manager.apiKeys.createPage.periodLabel')}
                  </Label>
                  <div className="relative">
                    <select
                      id="period"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as '7d' | '30d')}
                    >
                      <option value="7d">{t('ui.manager.apiKeys.createPage.period7d')}</option>
                      <option value="30d">{t('ui.manager.apiKeys.createPage.period30d')}</option>
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
                  {t('ui.manager.apiKeys.createPage.assigneeLabel')}
                </Label>
                <div className="relative">
                  <select
                    id="assignee"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">{t('ui.manager.apiKeys.createPage.unassigned')}</option>
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
                <p className="text-xs text-muted-foreground">{t('ui.manager.apiKeys.createPage.assigneeHint')}</p>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t border-muted/40 px-6 py-4 flex justify-between items-center">
              <Button type="button" variant="ghost" onClick={() => window.history.back()}>
                {t('ui.manager.apiKeys.createPage.cancel')}
              </Button>
              <Button type="submit" className="px-8 shadow-sm">
                {t('ui.manager.apiKeys.createPage.submit')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </ManagerLayout>
  )
}

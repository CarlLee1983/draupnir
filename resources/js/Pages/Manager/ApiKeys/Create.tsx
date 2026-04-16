import { useState } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTranslation, type I18nMessage } from '@/lib/i18n'

interface Assignee {
  userId: string
  email: string
}
interface Props {
  assignees: Assignee[]
  newKeyValue?: string
}

export default function ManagerApiKeyCreate({ assignees, newKeyValue }: Props) {
  const { t } = useTranslation()
  const { flash } = usePage<{ flash?: { error?: I18nMessage } }>().props
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
      <div className="p-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>建立 API Key</CardTitle>
          </CardHeader>
          <CardContent>
            {newKeyValue && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-3">
                <p className="text-sm font-medium text-green-800 mb-1">
                  API Key 建立成功！請立即複製保存，離開後將無法再次查看。
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 text-xs bg-white border rounded px-2 py-1 break-all select-all">
                    {newKeyValue}
                  </code>
                  <button
                    type="button"
                    onClick={copyKey}
                    className="shrink-0 text-xs px-2 py-1 rounded border border-green-400 text-green-700 hover:bg-green-100"
                  >
                    {copied ? '已複製' : '複製'}
                  </button>
                </div>
              </div>
            )}
            {flash?.error && (
              <p className="text-sm text-red-600 rounded-md border border-red-200 bg-red-50 px-3 py-2 mb-3">
                {t(flash.error.key, flash.error.params)}
              </p>
            )}
            <form onSubmit={submit} className="grid gap-3">
              <div>
                <label className="text-sm">Key 名稱</label>
                <Input required value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">配額上限</label>
                <Input
                  type="number"
                  min={0}
                  value={quota}
                  onChange={(e) => setQuota(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm">重置週期</label>
                <select
                  className="border rounded px-2 py-1 bg-background w-full"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as '7d' | '30d')}
                >
                  <option value="7d">每 7 天</option>
                  <option value="30d">每 30 天</option>
                </select>
              </div>
              <div>
                <label className="text-sm">指派給成員（可選）</label>
                <select
                  className="border rounded px-2 py-1 bg-background w-full"
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
              </div>
              <Button type="submit">建立</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  )
}

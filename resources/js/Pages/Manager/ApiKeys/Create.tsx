import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Assignee {
  userId: string
  email: string
}
interface Props {
  assignees: Assignee[]
}

export default function ManagerApiKeyCreate({ assignees }: Props) {
  const [label, setLabel] = useState('')
  const [quota, setQuota] = useState<number | ''>('')
  const [period, setPeriod] = useState<'7d' | '30d'>('30d')
  const [assignee, setAssignee] = useState<string>('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    router.post('/manager/api-keys', {
      label,
      quotaAllocated: quota === '' ? undefined : Number(quota),
      budgetResetPeriod: period,
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

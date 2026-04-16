import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Organization {
  id: string
  name: string
  description: string
  slug: string
}
interface Contract {
  id: string
  status: string
  terms: { creditQuota?: number; startDate?: string; endDate?: string }
}
interface Props {
  organization: Organization | null
  contracts: Contract[]
  error: { key: string } | null
}

export default function ManagerOrganizationIndex({ organization, contracts, error }: Props) {
  const [name, setName] = useState(organization?.name ?? '')
  const [description, setDescription] = useState(organization?.description ?? '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    router.put('/manager/organization', { name, description })
  }

  return (
    <ManagerLayout>
      <Head title="組織設定" />
      <div className="p-4 grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>組織資訊</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 max-w-md">
              <div>
                <label className="text-sm">組織名稱</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">描述</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button type="submit">儲存</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>合約（唯讀）</CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">尚無合約</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">狀態</th>
                    <th className="text-right">配額</th>
                    <th className="text-left">有效期</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td>{c.status}</td>
                      <td className="text-right">{c.terms.creditQuota ?? '-'}</td>
                      <td>
                        {c.terms.startDate ?? '-'} ~ {c.terms.endDate ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500">載入失敗</p>}
      </div>
    </ManagerLayout>
  )
}

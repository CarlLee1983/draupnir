import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

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

const formatNumber = (num: number | null | undefined) => {
  if (num == null) return '-'
  return new Intl.NumberFormat().format(num)
}

const getContractStatusVariant = (status: string) => {
  const s = status.toLowerCase()
  if (s === 'active') return 'default'
  if (s === 'pending') return 'secondary'
  if (s === 'expired') return 'destructive'
  return 'outline'
}

const getContractStatusLabel = (status: string) => {
  const s = status.toLowerCase()
  if (s === 'active') return '作用中'
  if (s === 'pending') return '待處理'
  if (s === 'expired') return '已過期'
  return status
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
      <div className="p-4 grid gap-6 max-w-5xl mx-auto">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">組織設定</h2>
          <p className="text-muted-foreground">管理您的組織資訊與檢視合約狀態。</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>組織資訊</CardTitle>
              <CardDescription>更新您的組織基本資料</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">組織名稱</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="輸入組織名稱"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">組織代碼 (Slug)</Label>
                  <Input id="slug" value={organization?.slug ?? '-'} disabled className="bg-muted" />
                  <p className="text-[0.8rem] text-muted-foreground">組織代碼為唯一識別碼，無法修改。</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <textarea
                    id="description"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="輸入組織描述"
                  />
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full md:w-auto">
                    儲存變更
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>合約概覽</CardTitle>
              <CardDescription>目前的合約與配額資訊</CardDescription>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <div className="h-24 flex items-center justify-center border rounded-md border-dashed">
                  <p className="text-sm text-muted-foreground">目前尚無任何合約</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>狀態</TableHead>
                        <TableHead className="text-right">配額</TableHead>
                        <TableHead className="text-right">有效期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Badge variant={getContractStatusVariant(c.status)}>
                              {getContractStatusLabel(c.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(c.terms.creditQuota)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            <div>{c.terms.startDate ?? '-'}</div>
                            <div>至</div>
                            <div>{c.terms.endDate ?? '-'}</div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {error && <p className="text-sm text-destructive mt-4">載入合約資料失敗，請重試。</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </ManagerLayout>
  )
}

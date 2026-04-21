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
import { useTranslation } from '@/lib/i18n'

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

export default function ManagerOrganizationIndex({ organization, contracts, error }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState(organization?.name ?? '')
  const [description, setDescription] = useState(organization?.description ?? '')

  const getContractStatusLabel = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'active') return t('ui.manager.organization.contractStatusActive')
    if (s === 'pending') return t('ui.manager.organization.contractStatusPending')
    if (s === 'expired') return t('ui.manager.organization.contractStatusExpired')
    return status
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    router.put('/manager/organization', { name, description })
  }

  return (
    <ManagerLayout>
      <Head title={t('ui.manager.organization.headTitle')} />
      <div className="p-4 grid gap-6 max-w-5xl mx-auto">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">{t('ui.manager.organization.pageTitle')}</h2>
          <p className="text-muted-foreground">{t('ui.manager.organization.pageDescription')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('ui.manager.organization.infoCardTitle')}</CardTitle>
              <CardDescription>{t('ui.manager.organization.infoCardDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('ui.manager.organization.nameLabel')}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('ui.manager.organization.namePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">{t('ui.manager.organization.slugLabel')}</Label>
                  <Input id="slug" value={organization?.slug ?? '-'} disabled className="bg-muted" />
                  <p className="text-[0.8rem] text-muted-foreground">{t('ui.manager.organization.slugHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t('ui.manager.organization.descriptionLabel')}</Label>
                  <textarea
                    id="description"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('ui.manager.organization.descriptionPlaceholder')}
                  />
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full md:w-auto">
                    {t('ui.manager.organization.saveButton')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('ui.manager.organization.contractsCardTitle')}</CardTitle>
              <CardDescription>{t('ui.manager.organization.contractsCardDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <div className="h-24 flex items-center justify-center border rounded-md border-dashed">
                  <p className="text-sm text-muted-foreground">{t('ui.manager.organization.noContracts')}</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('ui.manager.organization.contractColStatus')}</TableHead>
                        <TableHead className="text-right">{t('ui.manager.organization.contractColQuota')}</TableHead>
                        <TableHead className="text-right">{t('ui.manager.organization.contractColValidity')}</TableHead>
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
                            <div>{t('ui.manager.organization.dateRangeSeparator')}</div>
                            <div>{c.terms.endDate ?? '-'}</div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {error && (
                <p className="text-sm text-destructive mt-4">{t('ui.manager.organization.contractLoadError')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ManagerLayout>
  )
}

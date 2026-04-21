import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Copy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime, maskApiKey } from '@/lib/format'
import type { Translator } from '@/lib/i18n'

export interface ApiKeyRow {
  id: string
  label: string
  keyPreview: string
  /** Bifrost secret for Gateway Authorization; null if not stored for this key */
  gatewayKeyValue: string | null
  status: 'active' | 'revoked' | 'suspended_no_credit'
  createdAt: string
  lastUsedAt: string | null
}

function KeyCopyCell({ row, t }: { row: ApiKeyRow; t: Translator }) {
  const [copied, setCopied] = useState(false)
  const secret = row.gatewayKeyValue
  const copy = () => {
    if (!secret) return
    void navigator.clipboard.writeText(secret).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      <code className="text-xs">{maskApiKey(row.keyPreview)}</code>
      {secret ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 opacity-70 hover:opacity-100"
          onClick={copy}
          aria-label={t('ui.member.apiKeys.copyKeyAria')}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-600" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          )}
        </Button>
      ) : null}
    </div>
  )
}

function statusBadge(status: ApiKeyRow['status'], t: Translator) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600">{t('ui.common.status.active')}</Badge>
    case 'revoked':
      return <Badge variant="destructive">{t('ui.common.status.revoked')}</Badge>
    case 'suspended_no_credit':
      return <Badge variant="outline">{t('ui.common.status.insufficientCredit')}</Badge>
  }
}

export function createApiKeyColumns(t: Translator): ColumnDef<ApiKeyRow>[] {
  return [
    {
      accessorKey: 'label',
      header: t('ui.common.name'),
    },
    {
      accessorKey: 'keyPreview',
      header: t('ui.admin.apiKeys.columns.key'),
      cell: ({ row }) => <KeyCopyCell row={row.original} t={t} />,
    },
    {
      accessorKey: 'status',
      header: t('ui.common.status'),
      cell: ({ row }) => statusBadge(row.original.status, t),
    },
    {
      accessorKey: 'createdAt',
      header: t('ui.common.createdAt'),
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      accessorKey: 'lastUsedAt',
      header: t('ui.common.lastUsed'),
      cell: ({ row }) => formatDateTime(row.original.lastUsedAt),
    },
  ]
}

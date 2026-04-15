import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCcw, Plus, BarChart } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface Props {
  orgId?: string | null
}

export const QuickActionsCard = React.memo(({ orgId }: Props) => {
  const { t } = useTranslation()
  const keysQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''

  return (
    <Card className="bg-white/[0.02] border-border rounded-lg shadow-indigo-500/5 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base text-white">{t('ui.member.dashboard.quickActionsTitle')}</CardTitle>
          <CardDescription className="text-white/40">{t('ui.member.dashboard.quickActionsDescription')}</CardDescription>
        </div>
        <RefreshCcw className="h-5 w-5 text-white/20" />
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <a
          href={`/member/api-keys/create${keysQuery}`}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-indigo-500 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
        >
          <Plus className="h-4 w-4" />
          {t('ui.member.dashboard.createApiKey')}
        </a>
        <a
          href={`/member/usage${keysQuery}`}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <BarChart className="h-4 w-4" />
          {t('ui.member.dashboard.viewUsage')}
        </a>
      </CardContent>
    </Card>
  )
})

QuickActionsCard.displayName = 'QuickActionsCard'

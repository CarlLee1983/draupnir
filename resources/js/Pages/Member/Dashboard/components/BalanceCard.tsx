import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet } from 'lucide-react'
import { formatCredit } from '@/lib/format'
import { useTranslation } from '@/lib/i18n'

interface Balance {
  balance: string
  lowBalanceThreshold: string
  status: string
}

interface Props {
  balance: Balance | null
}

export const BalanceCard = React.memo(({ balance }: Props) => {
  const { t } = useTranslation()
  const isLow = balance
    ? Number.parseFloat(balance.balance) < Number.parseFloat(balance.lowBalanceThreshold)
    : false

  return (
    <Card className="bg-white/[0.02] border-border rounded-lg shadow-indigo-500/5 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base text-white">{t('ui.member.dashboard.balanceTitle')}</CardTitle>
          <CardDescription className="text-white/40">{t('ui.member.dashboard.balanceDescription')}</CardDescription>
        </div>
        <Wallet className="h-5 w-5 text-white/20" />
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <div className="text-3xl font-bold tracking-tight text-white">
          {balance ? formatCredit(balance.balance) : '—'}
        </div>
        {balance && isLow ? (
          <Badge variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20">
            {t('ui.member.dashboard.lowBalance')}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  )
})

BalanceCard.displayName = 'BalanceCard'

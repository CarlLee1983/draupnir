import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReactNode } from 'react'
import React from 'react'
import { useTranslation } from '@/lib/i18n'

interface Props {
  title: string
  message: string
  headerRight?: ReactNode
}

export const EmptyChart = React.memo(({ title, message, headerRight }: Props) => {
  const { t } = useTranslation()
  return (
    <Card className="overflow-hidden border-dashed border-border rounded-lg shadow-none">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{t('ui.charts.empty.subtitle')}</CardDescription>
        </div>
        {headerRight}
      </CardHeader>
      <CardContent className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )
})

EmptyChart.displayName = 'EmptyChart'

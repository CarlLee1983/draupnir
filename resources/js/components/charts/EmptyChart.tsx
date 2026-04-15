import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'

interface Props {
  title: string
  message: string
}

export const EmptyChart = React.memo(({ title, message }: Props) => {
  return (
    <Card className="overflow-hidden border-dashed border-border rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Chart placeholder</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )
})

EmptyChart.displayName = 'EmptyChart'

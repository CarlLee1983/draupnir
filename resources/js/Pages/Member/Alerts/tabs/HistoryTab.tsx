import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import AlertEventRow from '../components/AlertEventRow'
import { listHistory } from '../api'
import type { AlertEventHistoryDTO } from '../types'

interface Props {
  orgId: string
  initial: AlertEventHistoryDTO[]
}

export default function HistoryTab({ orgId, initial }: Props) {
  const { toast } = useToast()
  const [events, setEvents] = useState(initial)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setEvents(initial)
  }, [initial])

  async function refresh() {
    setLoading(true)
    try {
      setEvents(await listHistory(orgId, { limit: 50, offset: 0 }))
    } catch (error_) {
      toast({
        title: 'Reload failed',
        description: error_ instanceof Error ? error_.message : 'Unable to load alert history',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Alert history</p>
            <h3 className="mt-1 text-lg font-semibold">Recent alert events</h3>
          </div>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void refresh()}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No alert events recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <AlertEventRow key={event.id} event={event} orgId={orgId} onResent={refresh} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestJson } from '../api'

interface Props {
  orgId: string
  initial: { budgetUsd: string | null; warningPct: number; criticalPct: number } | null
}

export default function BudgetsTab({ orgId, initial }: Props) {
  const { toast } = useToast()
  const [budgetUsd, setBudgetUsd] = useState(initial?.budgetUsd ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setBudgetUsd(initial?.budgetUsd ?? '')
  }, [initial?.budgetUsd])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = await requestJson<{ id: string; orgId: string; budgetUsd: string }>(
        `/api/organizations/${encodeURIComponent(orgId)}/alerts/budget`,
        {
          method: 'PUT',
          body: JSON.stringify({ budgetUsd }),
        },
      )
      setBudgetUsd(payload.budgetUsd)
      toast({ title: 'Saved', description: 'Alert budget updated.' })
    } catch (error_) {
      toast({
        title: 'Update failed',
        description: error_ instanceof Error ? error_.message : 'Unable to update budget',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-50 shadow-xl">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-emerald-200/80">Budget controls</p>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Monthly spend guardrail</h2>
            <p className="max-w-xl text-sm text-slate-300">
              Set a monthly budget and the backend will continue to trigger warning and critical alerts
              when usage crosses the configured thresholds.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Warning at {initial?.warningPct ?? 80}%</Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-100">
              Critical at {initial?.criticalPct ?? 100}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budgetUsd">Monthly budget (USD)</Label>
              <Input
                id="budgetUsd"
                value={budgetUsd}
                onChange={(e) => setBudgetUsd(e.target.value)}
                placeholder="1000.00"
                inputMode="decimal"
                required
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Save budget'}
            </Button>
          </form>

          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            Current budget: <span className="font-medium text-foreground">{budgetUsd || 'Not set'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

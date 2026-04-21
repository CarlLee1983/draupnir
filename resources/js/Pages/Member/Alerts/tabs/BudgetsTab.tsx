import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestJson } from '../api'
import { useTranslation } from '@/lib/i18n'

interface Props {
  orgId: string
  initial: { budgetUsd: string | null; warningPct: number; criticalPct: number } | null
}

export default function BudgetsTab({ orgId, initial }: Props) {
  const { t } = useTranslation()
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
      toast({ title: t('ui.member.alerts.toast.budgetSaved'), description: t('ui.member.alerts.toast.budgetSavedDesc') })
    } catch (error_) {
      toast({
        title: t('ui.member.alerts.toast.budgetUpdateFailed'),
        description: error_ instanceof Error ? error_.message : t('ui.member.alerts.toast.budgetUpdateFailedDesc'),
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
          <p className="text-sm uppercase tracking-[0.18em] text-emerald-200/80">
            {t('ui.member.alerts.budgets.sectionEyebrow')}
          </p>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">{t('ui.member.alerts.budgets.cardTitle')}</h2>
            <p className="max-w-xl text-sm text-slate-300">{t('ui.member.alerts.budgets.cardDescription')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {t('ui.member.alerts.budgets.warningAt', { pct: initial?.warningPct ?? 80 })}
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-100">
              {t('ui.member.alerts.budgets.criticalAt', { pct: initial?.criticalPct ?? 100 })}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budgetUsd">{t('ui.member.alerts.budgets.monthlyBudgetUsd')}</Label>
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
              {saving ? t('ui.member.alerts.budgets.saving') : t('ui.member.alerts.budgets.save')}
            </Button>
          </form>

          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            {t('ui.member.alerts.budgets.currentLabel')}{' '}
            <span className="font-medium text-foreground">
              {budgetUsd || t('ui.member.alerts.budgets.notSet')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

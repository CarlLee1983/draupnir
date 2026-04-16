import { useState, useMemo } from 'react'
import { router } from '@inertiajs/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export interface QuotaKeyRow {
  id: string
  label: string
  allocated: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  contractCap: number
  sumAllocated: number
  keys: QuotaKeyRow[]
}

interface KeyChange {
  id: string
  label: string
  oldAllocated: number
  newAllocated: number
}

function computeProportionalReduction(
  keys: QuotaKeyRow[],
  newCap: number,
): KeyChange[] {
  const sumAllocated = keys.reduce((s, k) => s + k.allocated, 0)
  if (sumAllocated === 0 || newCap >= sumAllocated) return []

  let runningSum = 0
  return keys.map((k, idx) => {
    const isLast = idx === keys.length - 1
    let newAlloc: number
    if (isLast) {
      newAlloc = newCap - runningSum
    } else {
      newAlloc = Math.round((k.allocated / sumAllocated) * newCap)
    }
    runningSum += newAlloc
    return { id: k.id, label: k.label, oldAllocated: k.allocated, newAllocated: newAlloc }
  })
}

export function QuotaAdjustModal({
  open,
  onOpenChange,
  contractId,
  contractCap,
  sumAllocated,
  keys,
}: Props) {
  const { t } = useTranslation()
  const [newCapInput, setNewCapInput] = useState('')
  const [loading, setLoading] = useState(false)

  const newCap = parseInt(newCapInput, 10)
  const isValid = !isNaN(newCap) && newCap >= 0

  const preview = useMemo<KeyChange[]>(() => {
    if (!isValid) return []
    return computeProportionalReduction(keys, newCap)
  }, [keys, newCap, isValid])

  const unallocated = contractCap - sumAllocated
  const isKeysUnchanged = isValid && newCap >= sumAllocated
  const hardBlockedKeys = preview.filter((c) => c.newAllocated < 0)

  function handleConfirm() {
    if (!isValid) return
    setLoading(true)
    router.post(
      `/admin/contracts/${contractId}/quota`,
      { newCap },
      {
        onFinish: () => {
          setLoading(false)
          onOpenChange(false)
          setNewCapInput('')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('ui.admin.contracts.quota.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 現況 */}
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('ui.admin.contracts.quota.currentCap')}</span>
              <span className="font-medium">{contractCap.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('ui.admin.contracts.quota.sumAllocated')}</span>
              <span className="font-medium">{sumAllocated.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('ui.admin.contracts.quota.unallocated')}</span>
              <span className="font-medium">{unallocated.toLocaleString()}</span>
            </div>
          </div>

          {/* 輸入新上限 */}
          <div className="space-y-2">
            <Label htmlFor="newCap">{t('ui.admin.contracts.quota.newCapLabel')}</Label>
            <Input
              id="newCap"
              type="number"
              min={0}
              value={newCapInput}
              onChange={(e) => setNewCapInput(e.target.value)}
              placeholder={String(contractCap)}
            />
          </div>

          {/* 影響預覽 */}
          {isValid && isKeysUnchanged && (
            <p className="text-sm text-muted-foreground">{t('ui.admin.contracts.quota.keysUnchanged')}</p>
          )}

          {isValid && !isKeysUnchanged && preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('ui.admin.contracts.quota.previewTitle')}</p>
              <div className="rounded-md border text-sm">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Key</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('ui.admin.contracts.quota.before')}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('ui.admin.contracts.quota.after')}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('ui.admin.contracts.quota.diff')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((c) => {
                      const diff = c.newAllocated - c.oldAllocated
                      const isBlocked = c.newAllocated < 0
                      return (
                        <tr key={c.id} className={isBlocked ? 'bg-destructive/10' : ''}>
                          <td className="px-3 py-2 truncate max-w-[120px]">{c.label}</td>
                          <td className="px-3 py-2 text-right">{c.oldAllocated.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{c.newAllocated.toLocaleString()}</td>
                          <td className={`px-3 py-2 text-right ${diff < 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {hardBlockedKeys.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{t('ui.admin.contracts.quota.hardBlockWarning')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('ui.common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || loading}>
            {loading ? t('ui.common.saving') : t('ui.admin.contracts.quota.confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

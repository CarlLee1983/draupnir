import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export type WindowOption = 7 | 30 | 90

interface Props {
  selectedWindow: WindowOption
  onWindowChange: (value: WindowOption) => void
  lastSyncedAt: string | null
  loading: boolean
}

export const DashboardHeader = React.memo(
  ({ selectedWindow, onWindowChange, lastSyncedAt, loading }: Props) => {
    const { t } = useTranslation()

    return (
      <header className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-indigo-400">
              {t('ui.member.dashboard.subtitle')}
            </p>
            <h1 className="font-sans text-4xl font-bold tracking-tight text-white">{t('ui.member.dashboard.title')}</h1>
            <p className="max-w-2xl text-sm text-white/50">{t('ui.member.dashboard.description')}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <WindowSelector value={selectedWindow} onChange={onWindowChange} />
            <div className="flex items-center gap-2">
              <StalenessLabel lastSyncedAt={lastSyncedAt} isLoading={loading} />
              <Button
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white transition-colors print:hidden"
                onClick={() => window.print()}
              >
                {t('ui.member.dashboard.downloadReport')}
              </Button>
            </div>
          </div>
        </div>
      </header>
    )
  },
)

DashboardHeader.displayName = 'DashboardHeader'

const WindowSelector = React.memo(
  ({ value, onChange }: { value: WindowOption; onChange: (value: WindowOption) => void }) => {
    const { t } = useTranslation()
    const options: { value: WindowOption; days: number }[] = [
      { value: 7, days: 7 },
      { value: 30, days: 30 },
      { value: 90, days: 90 },
    ]

    return (
      <div className="inline-flex rounded-xl border border-white/5 bg-white/[0.03] p-1 shadow-sm backdrop-blur-sm">
        {options.map((option) => {
          const active = value === option.value
          return (
            <Button
              key={option.value}
              type="button"
              variant={active ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'min-w-16 rounded-lg px-4 transition-all',
                active
                  ? 'bg-white/10 text-white shadow-sm hover:bg-white/15'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5',
              )}
              onClick={() => onChange(option.value)}
            >
              {t('ui.member.dashboard.windowDays', { days: option.days })}
            </Button>
          )
        })}
      </div>
    )
  },
)

WindowSelector.displayName = 'WindowSelector'

const StalenessLabel = React.memo(
  ({ lastSyncedAt, isLoading }: { lastSyncedAt: string | null; isLoading: boolean }) => {
    const { t } = useTranslation()

    if (isLoading) {
      return <span className="text-xs text-white/20">{t('ui.member.dashboard.staleness.syncing')}</span>
    }

    if (!lastSyncedAt) {
      return <span className="text-xs text-white/20">{t('ui.member.dashboard.staleness.notSynced')}</span>
    }

    const deltaMins = Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 60_000)
    const label =
      deltaMins < 1
        ? t('ui.member.dashboard.staleness.justNow')
        : deltaMins < 60
          ? t('ui.member.dashboard.staleness.minutesAgo', { mins: deltaMins })
          : t('ui.member.dashboard.staleness.hoursAgo', { hrs: Math.floor(deltaMins / 60) })

    if (deltaMins > 30) {
      return (
        <Badge variant="destructive" className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/20">
          {label}
        </Badge>
      )
    }

    if (deltaMins > 10) {
      return (
        <Badge variant="secondary" className="border-amber-500/20 bg-amber-500/10 text-xs text-amber-400">
          {label}
        </Badge>
      )
    }

    return <span className="text-xs text-white/40">{label}</span>
  },
)

StalenessLabel.displayName = 'StalenessLabel'

import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type BannerTone = 'warning' | 'destructive' | 'info'

interface BannerProps {
  tone?: BannerTone
  title?: string
  message: string
  className?: string
}

const toneStyles: Record<BannerTone, string> = {
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  destructive: 'border-destructive/50 bg-destructive/10 text-destructive',
  info: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400',
}

const toneIcons: Record<BannerTone, React.ReactNode> = {
  warning: <AlertTriangle className="h-4 w-4" />,
  destructive: <AlertCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
}

export function Banner({ tone = 'info', title, message, className }: BannerProps) {
  return (
    <div className={cn('flex gap-3 rounded-xl border p-4 shadow-sm backdrop-blur-sm', toneStyles[tone], className)}>
      <div className="mt-0.5 shrink-0">{toneIcons[tone]}</div>
      <div className="space-y-1">
        {title && <h4 className="text-sm font-bold leading-none tracking-tight">{title}</h4>}
        <p className="text-sm leading-relaxed opacity-90">{message}</p>
      </div>
    </div>
  )
}

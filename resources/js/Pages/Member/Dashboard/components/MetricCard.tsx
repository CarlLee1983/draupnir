import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  /** Label for the metric */
  title: string
  /** The primary large value display */
  value: string
  /** Optional currency or unit suffix */
  suffix?: string
  /** Optional icon for the top-right corner */
  icon?: ReactNode
  /** Tailwind gradient or background class for the accent line */
  accentClassName?: string
  /** Change percentage compared to the previous period */
  changePercent?: number
  /** Additional text below the value if no change percentage */
  subtitle?: string
}

/**
 * MetricCard component for the "Midnight Bloom" dashboard aesthetic.
 * Features a glassmorphic background, neon accent line, and clear data hierarchy.
 */
export function MetricCard({
  title,
  value,
  suffix,
  icon,
  accentClassName,
  changePercent,
  subtitle,
}: MetricCardProps) {
  const isPositive = changePercent !== undefined && changePercent > 0
  const isNegative = changePercent !== undefined && changePercent < 0

  return (
    <div className="group relative overflow-hidden bg-[#09090b]/40 p-6 transition-all hover:bg-white/[0.05]">
      {/* Accent Gradient Line */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r opacity-50 transition-opacity group-hover:opacity-100',
          accentClassName ?? 'from-indigo-500 to-purple-500',
        )}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5">
            <h3 className="font-sans text-2xl font-bold tracking-tight text-white">{value}</h3>
            {suffix && (
              <span className="font-mono text-[10px] uppercase text-white/30 tracking-tight">
                {suffix}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className="rounded-lg bg-white/5 p-2 text-white/40 transition-colors group-hover:text-white/60">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {changePercent !== undefined ? (
          <div
            className={cn(
              'flex items-center gap-1 font-mono text-[10px] font-semibold',
              isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-white/40',
            )}
          >
            {isPositive ? '↑' : isNegative ? '↓' : ''} {Math.abs(changePercent).toFixed(1)}%
            <span className="ml-0.5 font-normal text-white/20">vs last period</span>
          </div>
        ) : subtitle ? (
          <p className="text-[10px] font-medium text-white/40 tracking-tight">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

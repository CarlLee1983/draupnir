import type { ReactNode } from 'react'

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/5 backdrop-blur-md">
      {children}
    </div>
  )
}

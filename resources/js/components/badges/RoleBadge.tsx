import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { Translator } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface RoleBadgeProps {
  role: string
  t: Translator
  className?: string
}

export function RoleBadge({ role, t, className }: RoleBadgeProps) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    admin: { label: t('ui.common.role.admin'), variant: 'default' },
    manager: { label: t('ui.common.role.manager'), variant: 'secondary' },
    member: { label: t('ui.common.role.member'), variant: 'outline' },
  }
  
  const config = map[role.toLowerCase()] || { label: role, variant: 'outline' as const }
  
  return (
    <Badge
      variant={config.variant}
      className={cn("px-3 py-0.5 rounded-md font-medium capitalize shadow-sm", className)}
    >
      {config.label}
    </Badge>
  )
}

export function TagBadge({ children, variant = 'secondary', className }: { children: React.ReactNode; variant?: 'default' | 'secondary' | 'outline'; className?: string }) {
  return (
    <Badge
      variant={variant}
      className={cn("px-3 py-0.5 rounded-md font-medium capitalize shadow-sm", className)}
    >
      {children}
    </Badge>
  )
}

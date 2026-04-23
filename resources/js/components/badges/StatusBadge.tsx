import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { Translator } from '@/lib/i18n'
import { ShieldCheck, ShieldAlert, CheckCircle2, Clock, XCircle, FileText, Zap, DollarSign, Activity, UserCheck, UserMinus, Send, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusType = 
  | 'active' 
  | 'inactive' 
  | 'suspended' 
  | 'revoked' 
  | 'suspended_no_credit' 
  | 'draft' 
  | 'expired' 
  | 'terminated'
  | 'free'
  | 'paid'
  | 'enabled'
  | 'disabled'
  | 'running'
  | 'pending'
  | 'assigned'
  | 'unassigned'
  | 'sent'
  | 'failed'

interface StatusBadgeProps {
  status: string
  t: Translator
  className?: string
}

export function StatusBadge({ status, t, className }: StatusBadgeProps) {
  // Normalize status for mapping
  const s = status.toLowerCase()

  switch (s) {
    case 'active':
    case 'running':
      const activeLabel = s === 'running' ? (t('ui.admin.usageSync.running') || 'Running') : t('ui.common.status.active')
      return (
        <Badge className={cn("gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-green-500/10 text-green-700 border-green-200/50 hover:bg-green-500/20", className)}>
          {s === 'running' ? <Activity className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
          {activeLabel}
        </Badge>
      )
    case 'enabled':
    case 'sent':
      const successLabel = s === 'sent' ? (t('ui.member.alerts.delivery.sent') || 'Sent') : (t('ui.common.status.enabled') || 'Enabled')
      return (
        <Badge className={cn("gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-green-500/10 text-green-700 border-green-200/50 hover:bg-green-500/20", className)}>
          {s === 'sent' ? <Send className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
          {successLabel}
        </Badge>
      )
    case 'assigned':
      return (
        <Badge className={cn("gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-blue-500/10 text-blue-700 border-blue-200/50", className)}>
          <UserCheck className="h-3 w-3" />
          {t('ui.common.assigned') || 'Assigned'}
        </Badge>
      )
    case 'unassigned':
    case 'notassigned':
      return (
        <Badge variant="outline" className={cn("gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm text-muted-foreground", className)}>
          <UserMinus className="h-3 w-3" />
          {t('ui.common.notAssigned') || 'Not Assigned'}
        </Badge>
      )
    case 'inactive':
    case 'suspended':
    case 'revoked':
    case 'terminated':
    case 'suspended_no_credit':
    case 'failed':
      const labelKey = s === 'inactive' ? 'ui.common.status.inactive' : 
                       s === 'suspended' ? 'ui.common.status.suspended' : 
                       s === 'revoked' ? 'ui.common.status.revoked' : 
                       s === 'suspended_no_credit' ? 'ui.common.status.insufficientCredit' :
                       s === 'failed' ? 'ui.member.alerts.delivery.failed' :
                       'ui.common.status.terminated'
      return (
        <Badge
          variant="destructive"
          className={cn("gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm", className)}
        >
          {s === 'failed' ? <AlertTriangle className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
          {t(labelKey) || s}
        </Badge>
      )
    case 'disabled':
      return (
        <Badge
          variant="secondary"
          className={cn("gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm", className)}
        >
          <ShieldAlert className="h-3 w-3" />
          {t('ui.common.status.disabled') || 'Disabled'}
        </Badge>
      )
    case 'draft':
      return (
        <Badge
          variant="outline"
          className={cn("gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-muted/50", className)}
        >
          <FileText className="h-3 w-3 text-muted-foreground" />
          {t('ui.common.status.draft')}
        </Badge>
      )
    case 'expired':
    case 'pending':
      const pendingLabel = s === 'pending' ? (t('ui.member.alerts.delivery.pending') || t('ui.common.status.pending') || 'Pending') : t('ui.common.status.expired')
      return (
        <Badge
          variant="secondary"
          className={cn("gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm", className)}
        >
          <Clock className="h-3 w-3" />
          {pendingLabel}
        </Badge>
      )
    case 'free':
      return (
        <Badge className={cn("gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-blue-500/10 text-blue-700 border-blue-200/50 hover:bg-blue-500/20", className)}>
          <Zap className="h-3 w-3" />
          {t('ui.admin.modules.create.typeFree')}
        </Badge>
      )
    case 'paid':
      return (
        <Badge className={cn("gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-amber-500/10 text-amber-700 border-amber-200/50 hover:bg-amber-500/20", className)}>
          <DollarSign className="h-3 w-3" />
          {t('ui.admin.modules.create.typePaid')}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-md shadow-sm", className)}>
          {status}
        </Badge>
      )
  }
}

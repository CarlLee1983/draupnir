import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/lib/i18n'

interface Props {
  status: 'pending' | 'sent' | 'failed'
}

export default function DeliveryStatusBadge({ status }: Props) {
  const { t } = useTranslation()
  const variant = status === 'failed' ? 'destructive' : status === 'sent' ? 'default' : 'secondary'
  const label =
    status === 'pending'
      ? t('ui.member.alerts.delivery.pending')
      : status === 'sent'
        ? t('ui.member.alerts.delivery.sent')
        : t('ui.member.alerts.delivery.failed')

  return <Badge variant={variant}>{label}</Badge>
}

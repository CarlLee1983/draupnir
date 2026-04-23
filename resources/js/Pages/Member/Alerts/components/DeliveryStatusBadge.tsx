import { useTranslation } from '@/lib/i18n'
import { StatusBadge } from '@/components/badges'

interface Props {
  status: 'pending' | 'sent' | 'failed'
}

export default function DeliveryStatusBadge({ status }: Props) {
  const { t } = useTranslation()
  return <StatusBadge status={status} t={t} />
}

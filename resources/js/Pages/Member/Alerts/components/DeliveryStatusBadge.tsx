import { Badge } from '@/components/ui/badge'

interface Props {
  status: 'pending' | 'sent' | 'failed'
}

export default function DeliveryStatusBadge({ status }: Props) {
  const variant = status === 'failed' ? 'destructive' : status === 'sent' ? 'default' : 'secondary'

  return <Badge variant={variant}>{status}</Badge>
}

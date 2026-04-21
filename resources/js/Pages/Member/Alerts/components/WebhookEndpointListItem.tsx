import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WebhookEndpointListDTO } from '../types'
import { useTranslation } from '@/lib/i18n'

interface Props {
  endpoint: WebhookEndpointListDTO
  onToggleActive: (endpoint: WebhookEndpointListDTO) => Promise<void>
  onRotate: (endpoint: WebhookEndpointListDTO) => Promise<void>
  onTest: (endpoint: WebhookEndpointListDTO) => Promise<void>
  onDelete: (endpoint: WebhookEndpointListDTO) => Promise<void>
}

export default function WebhookEndpointListItem({
  endpoint,
  onToggleActive,
  onRotate,
  onTest,
  onDelete,
}: Props) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{endpoint.url}</p>
            <Badge variant={endpoint.active ? 'default' : 'secondary'}>
              {endpoint.active ? t('ui.member.alerts.webhooks.active') : t('ui.member.alerts.webhooks.paused')}
            </Badge>
          </div>
          {endpoint.description ? (
            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t('ui.member.alerts.webhooks.noDescription')}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('ui.member.alerts.webhooks.secretMask', { mask: endpoint.secretMask })}
          </p>
          <div className="text-xs text-muted-foreground">
            {t('ui.member.alerts.webhooks.createdAt', {
              time: new Date(endpoint.createdAt).toLocaleString(),
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void onTest(endpoint)}>
            {t('ui.member.alerts.webhooks.sendTest')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void onRotate(endpoint)}>
            {t('ui.member.alerts.webhooks.rotateSecret')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void onToggleActive(endpoint)}>
            {endpoint.active ? t('ui.member.alerts.webhooks.deactivate') : t('ui.member.alerts.webhooks.activate')}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => void onDelete(endpoint)}>
            {t('ui.member.alerts.webhooks.delete')}
          </Button>
        </div>
      </div>
    </div>
  )
}

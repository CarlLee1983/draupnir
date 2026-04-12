import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WebhookEndpointListDTO } from '../types'

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
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{endpoint.url}</p>
            <Badge variant={endpoint.active ? 'default' : 'secondary'}>
              {endpoint.active ? 'Active' : 'Paused'}
            </Badge>
          </div>
          {endpoint.description ? (
            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}
          <p className="text-xs text-muted-foreground">Secret: {endpoint.secretMask}</p>
          <div className="text-xs text-muted-foreground">
            Created {new Date(endpoint.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void onTest(endpoint)}>
            Send test
          </Button>
          <Button variant="outline" size="sm" onClick={() => void onRotate(endpoint)}>
            Rotate secret
          </Button>
          <Button variant="outline" size="sm" onClick={() => void onToggleActive(endpoint)}>
            {endpoint.active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => void onDelete(endpoint)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

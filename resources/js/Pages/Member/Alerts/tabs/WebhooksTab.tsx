import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SecretRevealModal from '../components/SecretRevealModal'
import WebhookEndpointForm from '../components/WebhookEndpointForm'
import WebhookEndpointListItem from '../components/WebhookEndpointListItem'
import {
  createWebhook,
  deleteWebhook,
  listWebhooks,
  rotateSecret,
  testWebhook,
  updateWebhook,
} from '../api'
import type { WebhookEndpointCreatedDTO, WebhookEndpointListDTO } from '../types'

interface Props {
  orgId: string
  initial: WebhookEndpointListDTO[]
}

interface SecretRevealState {
  label: string
  secret: string
}

export default function WebhooksTab({ orgId, initial }: Props) {
  const { toast } = useToast()
  const [endpoints, setEndpoints] = useState(initial)
  const [secretReveal, setSecretReveal] = useState<SecretRevealState | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setEndpoints(initial)
  }, [initial])

  async function reload() {
    setEndpoints(await listWebhooks(orgId))
  }

  function revealSecret(endpoint: WebhookEndpointCreatedDTO) {
    setSecretReveal({ label: endpoint.url, secret: endpoint.secret })
  }

  async function handleCreate(values: { url: string; description: string | null }) {
    setLoading(true)
    try {
      const created = await createWebhook(orgId, values)
      revealSecret(created)
      toast({ title: 'Created', description: 'Webhook endpoint registered.' })
      await reload()
    } catch (error_) {
      toast({
        title: 'Create failed',
        description: error_ instanceof Error ? error_.message : 'Unable to create webhook',
        variant: 'destructive',
      })
      throw error_
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(endpoint: WebhookEndpointListDTO) {
    try {
      await updateWebhook(orgId, endpoint.id, { active: !endpoint.active })
      toast({ title: 'Updated', description: endpoint.active ? 'Webhook paused.' : 'Webhook activated.' })
      await reload()
    } catch (error_) {
      toast({
        title: 'Update failed',
        description: error_ instanceof Error ? error_.message : 'Unable to update webhook',
        variant: 'destructive',
      })
    }
  }

  async function handleRotate(endpoint: WebhookEndpointListDTO) {
    try {
      const rotated = await rotateSecret(orgId, endpoint.id)
      revealSecret(rotated)
      toast({ title: 'Rotated', description: 'New secret generated.' })
      await reload()
    } catch (error_) {
      toast({
        title: 'Rotate failed',
        description: error_ instanceof Error ? error_.message : 'Unable to rotate secret',
        variant: 'destructive',
      })
    }
  }

  async function handleTest(endpoint: WebhookEndpointListDTO) {
    try {
      const result = await testWebhook(orgId, endpoint.id)
      toast({
        title: result.success ? 'Test sent' : 'Test failed',
        description: result.success
          ? `Attempts: ${result.attempts}`
          : result.error ?? 'Webhook test failed',
        variant: result.success ? 'default' : 'destructive',
      })
    } catch (error_) {
      toast({
        title: 'Test failed',
        description: error_ instanceof Error ? error_.message : 'Unable to test webhook',
        variant: 'destructive',
      })
    }
  }

  async function handleDelete(endpoint: WebhookEndpointListDTO) {
    const confirmed = window.confirm(`Delete webhook endpoint ${endpoint.url}?`)
    if (!confirmed) return

    try {
      await deleteWebhook(orgId, endpoint.id)
      toast({ title: 'Deleted', description: 'Webhook endpoint removed.' })
      await reload()
    } catch (error_) {
      toast({
        title: 'Delete failed',
        description: error_ instanceof Error ? error_.message : 'Unable to delete webhook',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <WebhookEndpointForm onSubmit={handleCreate} />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Registered webhooks</p>
              <h3 className="mt-1 text-lg font-semibold">Delivery endpoints</h3>
            </div>
            <Button variant="outline" size="sm" disabled={loading} onClick={() => void reload()}>
              Refresh
            </Button>
          </div>

          {endpoints.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No webhook endpoints have been registered yet.
            </div>
          ) : (
            <div className="space-y-3">
              {endpoints.map((endpoint) => (
                <WebhookEndpointListItem
                  key={endpoint.id}
                  endpoint={endpoint}
                  onToggleActive={handleToggleActive}
                  onRotate={handleRotate}
                  onTest={handleTest}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SecretRevealModal
        open={secretReveal !== null}
        secret={secretReveal?.secret ?? ''}
        label={secretReveal?.label}
        onClose={() => setSecretReveal(null)}
      />
    </div>
  )
}

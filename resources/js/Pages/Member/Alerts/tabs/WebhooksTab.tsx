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
import { useTranslation } from '@/lib/i18n'

interface Props {
  orgId: string
  initial: WebhookEndpointListDTO[]
}

interface SecretRevealState {
  label: string
  secret: string
}

export default function WebhooksTab({ orgId, initial }: Props) {
  const { t } = useTranslation()
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
      toast({
        title: t('ui.member.alerts.toast.webhookCreated'),
        description: t('ui.member.alerts.toast.webhookCreatedDesc'),
      })
      await reload()
    } catch (error_) {
      toast({
        title: t('ui.member.alerts.toast.webhookCreateFailed'),
        description: error_ instanceof Error ? error_.message : t('ui.member.alerts.webhooks.createFailed'),
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
      toast({
        title: t('ui.member.alerts.toast.webhookUpdated'),
        description: endpoint.active
          ? t('ui.member.alerts.toast.webhookPaused')
          : t('ui.member.alerts.toast.webhookActivated'),
      })
      await reload()
    } catch (error_) {
      toast({
        title: t('ui.member.alerts.toast.webhookUpdateFailed'),
        description: error_ instanceof Error ? error_.message : t('ui.member.alerts.webhooks.createFailed'),
        variant: 'destructive',
      })
    }
  }

  async function handleRotate(endpoint: WebhookEndpointListDTO) {
    try {
      const rotated = await rotateSecret(orgId, endpoint.id)
      revealSecret(rotated)
      toast({
        title: t('ui.member.alerts.toast.secretRotated'),
        description: t('ui.member.alerts.toast.newSecretGenerated'),
      })
      await reload()
    } catch (error_) {
      toast({
        title: t('ui.member.alerts.toast.webhookRotateFailed'),
        description: error_ instanceof Error ? error_.message : t('ui.member.alerts.webhooks.createFailed'),
        variant: 'destructive',
      })
    }
  }

  async function handleTest(endpoint: WebhookEndpointListDTO) {
    try {
      const result = await testWebhook(orgId, endpoint.id)
      toast({
        title: result.success ? t('ui.member.alerts.toast.testSent') : t('ui.member.alerts.toast.testFailed'),
        description: result.success
          ? t('ui.member.alerts.toast.testAttempts', { attempts: result.attempts })
          : result.error ?? t('ui.member.alerts.toast.testFailedDesc'),
        variant: result.success ? 'default' : 'destructive',
      })
    } catch (error_) {
      toast({
        title: t('ui.member.alerts.toast.webhookTestFailed'),
        description: error_ instanceof Error ? error_.message : t('ui.member.alerts.webhooks.createFailed'),
        variant: 'destructive',
      })
    }
  }

  async function handleDelete(endpoint: WebhookEndpointListDTO) {
    const confirmed = window.confirm(t('ui.member.alerts.webhooks.deleteConfirm', { url: endpoint.url }))
    if (!confirmed) return

    try {
      await deleteWebhook(orgId, endpoint.id)
      toast({
        title: t('ui.member.alerts.toast.webhookDeleted'),
        description: t('ui.member.alerts.toast.webhookRemovedDesc'),
      })
      await reload()
    } catch (error_) {
      toast({
        title: t('ui.member.alerts.toast.webhookDeleteFailed'),
        description: error_ instanceof Error ? error_.message : t('ui.member.alerts.webhooks.createFailed'),
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
              <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                {t('ui.member.alerts.webhooks.listEyebrow')}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{t('ui.member.alerts.webhooks.listTitle')}</h3>
            </div>
            <Button variant="outline" size="sm" disabled={loading} onClick={() => void reload()}>
              {t('ui.member.alerts.webhooks.refresh')}
            </Button>
          </div>

          {endpoints.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              {t('ui.member.alerts.webhooks.empty')}
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

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/lib/i18n'

interface Props {
  onSubmit: (values: { url: string; description: string | null }) => Promise<void>
}

export default function WebhookEndpointForm({ onSubmit }: Props) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        url: url.trim(),
        description: description.trim().length > 0 ? description.trim() : null,
      })
      setUrl('')
      setDescription('')
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('ui.member.alerts.webhooks.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
          {t('ui.member.alerts.webhooks.createEyebrow')}
        </p>
        <h3 className="mt-1 text-lg font-semibold">{t('ui.member.alerts.webhooks.registerTitle')}</h3>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1.6fr_1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">{t('ui.member.alerts.webhooks.urlLabel')}</Label>
          <Input
            id="webhook-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('ui.member.alerts.webhooks.placeholderUrl')}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-description">{t('ui.member.alerts.webhooks.descriptionLabel')}</Label>
          <Input
            id="webhook-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('ui.member.alerts.webhooks.placeholderDescription')}
            maxLength={200}
          />
        </div>

        <div className="flex items-end">
          <Button type="submit" disabled={submitting} className="w-full md:w-auto">
            {submitting ? t('ui.member.alerts.webhooks.creating') : t('ui.member.alerts.webhooks.createSubmit')}
          </Button>
        </div>
      </div>
    </form>
  )
}

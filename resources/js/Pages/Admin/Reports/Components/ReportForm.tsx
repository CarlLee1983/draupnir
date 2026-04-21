import { useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TimezonePicker } from './TimezonePicker'
import { useTranslation } from '@/lib/i18n'

interface Props {
  orgId: string
  initialData?: any
  onSuccess: () => void
}

export function ReportForm({ orgId, initialData, onSuccess }: Props) {
  const { t } = useTranslation()
  const form = useForm({
    type: initialData?.type || 'weekly',
    day: initialData?.day || 1,
    time: initialData?.time || '09:00',
    timezone: initialData?.timezone || 'UTC',
    recipients: initialData?.recipients?.join(', ') || '',
    enabled: initialData?.enabled ?? true,
  })
  const { data, setData, processing, errors } = form

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const options = { onSuccess: () => onSuccess() }
    form.transform((d) => ({
      ...d,
      recipients: d.recipients.split(',').map((s: string) => s.trim()).filter(Boolean),
    }))

    if (initialData) {
      form.put(`/v1/org/${orgId}/reports/${initialData.id}`, options)
    } else {
      form.post(`/v1/org/${orgId}/reports`, options)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t('ui.admin.reports.frequencyLabel')}</Label>
        <select
          value={data.type}
          onChange={(e) => setData('type', e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="weekly">{t('ui.admin.reports.freqWeekly')}</option>
          <option value="monthly">{t('ui.admin.reports.freqMonthly')}</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{data.type === 'weekly' ? t('ui.admin.reports.dayOfWeekLabel') : t('ui.admin.reports.dayOfMonthLabel')}</Label>
          <select
            value={String(data.day)}
            onChange={(e) => setData('day', parseInt(e.target.value, 10))}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {data.type === 'weekly' ? (
              <>
                <option value="1">{t('ui.admin.reports.monday')}</option>
                <option value="2">{t('ui.admin.reports.tuesday')}</option>
                <option value="3">{t('ui.admin.reports.wednesday')}</option>
                <option value="4">{t('ui.admin.reports.thursday')}</option>
                <option value="5">{t('ui.admin.reports.friday')}</option>
                <option value="6">{t('ui.admin.reports.saturday')}</option>
                <option value="7">{t('ui.admin.reports.sunday')}</option>
              </>
            ) : (
              Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>{t('ui.admin.reports.dayOfLabel', { day: d })}</option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-2">
          <Label>{t('ui.admin.reports.timeLabel')}</Label>
          <Input 
            type="time" 
            value={data.time} 
            onChange={(e) => setData('time', e.target.value)} 
          />
          {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('ui.admin.reports.timezoneLabel')}</Label>
        <TimezonePicker 
          value={data.timezone} 
          onChange={(v: string) => setData('timezone', v)} 
        />
      </div>

      <div className="space-y-2">
        <Label>{t('ui.admin.reports.recipientsLabel')}</Label>
        <Input 
          placeholder={t('ui.admin.reports.recipientsPlaceholder')} 
          value={data.recipients}
          onChange={(e) => setData('recipients', e.target.value)}
        />
        {errors.recipients && <p className="text-xs text-destructive">{errors.recipients}</p>}
      </div>

      <div className="flex items-center space-x-2 py-2">
        <input 
          type="checkbox"
          id="enabled" 
          checked={data.enabled} 
          onChange={(e) => setData('enabled', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="enabled">{t('ui.admin.reports.enableCheckbox')}</Label>
      </div>

      <div className="pt-4 flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onSuccess}>{t('ui.admin.contracts.create.cancelButton')}</Button>
        <Button type="submit" disabled={processing}>
          {initialData ? t('ui.admin.reports.updateButton') : t('ui.admin.reports.createButton')}
        </Button>
      </div>
    </form>
  )
}

import { Info } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface Props {
  value: string
  onChange: (value: string) => void
}

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Taipei',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
]

export function TimezonePicker({ value, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
      >
        <option value="">{t('ui.admin.reports.timezonePlaceholder')}</option>
        {COMMON_TIMEZONES.map((tz) => (
          <option key={tz} value={tz}>{tz}</option>
        ))}
      </select>
      <p className="text-[10px] text-muted-foreground flex items-center">
        <Info className="mr-1 h-3 w-3" />
        {t('ui.admin.reports.timezoneDescription')}
      </p>
    </div>
  )
}

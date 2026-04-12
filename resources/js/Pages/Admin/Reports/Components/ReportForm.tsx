import { useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TimezonePicker } from './TimezonePicker'

interface Props {
  orgId: string
  initialData?: any
  onSuccess: () => void
}

export function ReportForm({ orgId, initialData, onSuccess }: Props) {
  const { data, setData, post, put, processing, errors } = useForm({
    type: initialData?.type || 'weekly',
    day: initialData?.day || 1,
    time: initialData?.time || '09:00',
    timezone: initialData?.timezone || 'UTC',
    recipients: initialData?.recipients?.join(', ') || '',
    enabled: initialData?.enabled ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      ...data,
      recipients: data.recipients.split(',').map((s: string) => s.trim()).filter(Boolean)
    }

    if (initialData) {
      put(`/v1/reports/${initialData.id}`, {
        onSuccess: () => onSuccess()
      })
    } else {
      post(`/v1/org/${orgId}/reports`, {
        onSuccess: () => onSuccess()
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Frequency</Label>
        <select
          value={data.type}
          onChange={(e) => setData('type', e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{data.type === 'weekly' ? 'Day of Week' : 'Day of Month'}</Label>
          <select
            value={String(data.day)}
            onChange={(e) => setData('day', parseInt(e.target.value, 10))}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {data.type === 'weekly' ? (
              <>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="7">Sunday</option>
              </>
            ) : (
              Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>Day {d}</option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Time (HH:mm)</Label>
          <Input 
            type="time" 
            value={data.time} 
            onChange={(e) => setData('time', e.target.value)} 
          />
          {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Timezone</Label>
        <TimezonePicker 
          value={data.timezone} 
          onChange={(v: string) => setData('timezone', v)} 
        />
      </div>

      <div className="space-y-2">
        <Label>Recipients (Comma separated emails)</Label>
        <Input 
          placeholder="admin@example.com, finance@example.com" 
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
        <Label htmlFor="enabled">Enable automated reports</Label>
      </div>

      <div className="pt-4 flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={processing}>
          {initialData ? 'Update Schedule' : 'Create Schedule'}
        </Button>
      </div>
    </form>
  )
}

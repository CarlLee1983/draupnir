import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Profile {
  displayName?: string
  timezone?: string
  locale?: string
}
interface Props {
  profile: Profile | null
  error: { key: string } | null
}

export default function ManagerSettingsIndex({ profile, error }: Props) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'Asia/Taipei')
  const [locale, setLocale] = useState(profile?.locale ?? 'zh-TW')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    router.put('/manager/settings', { displayName, timezone, locale })
  }

  return (
    <ManagerLayout>
      <Head title="個人設定" />
      <div className="p-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>個人設定</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3">
              <div>
                <label className="text-sm">顯示名稱</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">時區</label>
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">語系</label>
                <Input value={locale} onChange={(e) => setLocale(e.target.value)} />
              </div>
              <Button type="submit">儲存</Button>
              {error && <p className="text-sm text-red-500">載入失敗</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  )
}

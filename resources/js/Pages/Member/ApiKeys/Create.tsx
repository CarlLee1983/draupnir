import { Head, router, useForm } from '@inertiajs/react'
import { useEffect } from 'react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  orgId: string | null
  createdKey: string | null
  formError: string | null
}

export default function ApiKeyCreate({ orgId, createdKey, formError }: Props) {
  const form = useForm({
    orgId: orgId ?? '',
    label: '',
    rateLimitRpm: 60,
    rateLimitTpm: 10_000,
  })

  useEffect(() => {
    form.setData('orgId', orgId ?? '')
  }, [orgId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post('/member/api-keys')
  }

  const handleDone = () => {
    router.visit(`/member/api-keys${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`)
  }

  return (
    <MemberLayout>
      <Head title="建立 API Key" />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">建立 API Key</h1>

        {createdKey ? (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle>Key 建立成功</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                請立即複製此 Key 並妥善保管，離開此頁面後將無法再次查看完整 Key。
              </p>
              <code className="block break-all rounded-md bg-muted p-3 text-sm">{createdKey}</code>
              <Button onClick={handleDone}>我已保存，返回列表</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              {formError && <div className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">{formError}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">名稱</Label>
                  <Input
                    id="label"
                    value={form.data.label}
                    onChange={(e) => form.setData('label', e.target.value)}
                    placeholder="例如：開發測試用"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rpm">每分鐘請求數上限（RPM）</Label>
                  <Input
                    id="rpm"
                    type="number"
                    value={form.data.rateLimitRpm}
                    onChange={(e) => form.setData('rateLimitRpm', parseInt(e.target.value, 10) || 0)}
                    min={1}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tpm">每分鐘 Token 上限（TPM）</Label>
                  <Input
                    id="tpm"
                    type="number"
                    value={form.data.rateLimitTpm}
                    onChange={(e) => form.setData('rateLimitTpm', parseInt(e.target.value, 10) || 0)}
                    min={1}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={form.processing || !orgId}>
                    {form.processing ? '建立中...' : '建立'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleDone}>
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </MemberLayout>
  )
}

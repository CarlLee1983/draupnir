import { useState, type FormEvent } from 'react'
import { router, usePage } from '@inertiajs/react'
import { resolveCsrfTokenForFetch } from '@/lib/csrf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ERROR_MESSAGES: Record<string, string> = {
  ADMIN_CANNOT_CREATE_ORG: '管理員帳號無法建立組織',
  SLUG_EXISTS: '此識別名稱已被使用，請換一個組織名稱後再試',
  NAME_REQUIRED: '請輸入組織名稱',
  MANAGER_NOT_FOUND: '無法驗證帳號，請重新登入後再試',
  CSRF_MISMATCH: '安全驗證失敗，請重新整理頁面後再試',
  PROVISION_FAILED: '建立組織時發生錯誤，請稍後再試或聯絡管理員',
}

export function CreateOrganizationModal({ open, onOpenChange }: Props) {
  const { csrfToken: inertiaCsrf } = usePage().props
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = (): string | null => {
    if (name.trim().length < 2) return '組織名稱至少需要 2 個字元'
    if (name.trim().length > 64) return '組織名稱不可超過 64 個字元'
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': resolveCsrfTokenForFetch(inertiaCsrf),
        },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (response.status === 419) {
        setError(ERROR_MESSAGES.CSRF_MISMATCH)
        return
      }

      const payload = (await response.json()) as {
        success: boolean
        error?: string
        message?: string
      }

      if (payload.success) {
        router.visit('/member/dashboard', { replace: true })
      } else if (payload.error === 'ALREADY_HAS_ORGANIZATION') {
        // Stale UI (e.g. another tab already created org); reload props from server
        router.visit('/member/dashboard', { replace: true })
      } else {
        setError(
          ERROR_MESSAGES[payload.error ?? ''] ?? payload.message ?? '建立失敗，請稍後再試',
        )
      }
    } catch {
      setError('建立失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>建立我的組織</DialogTitle>
          <DialogDescription>
            建立組織以開始使用 API Key、帳單與儀表板功能。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">組織名稱</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：我的科技公司"
              minLength={2}
              maxLength={64}
              disabled={submitting}
              autoFocus
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting || name.trim().length < 2}>
              {submitting ? '建立中…' : '建立組織'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

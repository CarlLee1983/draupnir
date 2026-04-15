import { useState, type FormEvent } from 'react'
import { router } from '@inertiajs/react'
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

function readCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_HAS_ORGANIZATION: '您已擁有一個組織',
  ADMIN_CANNOT_CREATE_ORG: '管理員帳號無法建立組織',
}

export function CreateOrganizationModal({ open, onOpenChange }: Props) {
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
          'X-CSRF-Token': readCsrfToken(),
        },
        body: JSON.stringify({ name: name.trim() }),
      })
      const payload = (await response.json()) as {
        success: boolean
        error?: string
        message?: string
      }

      if (payload.success) {
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

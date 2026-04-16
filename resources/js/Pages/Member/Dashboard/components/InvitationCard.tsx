import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import { router } from '@inertiajs/react'
import { resolveCsrfTokenForFetch } from '@/lib/csrf'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface PendingInvitation {
  id: string
  organizationId: string
  organizationName: string
  role: string
  expiresAt: string
}

interface Props {
  invitation: PendingInvitation
  onDeclined: (id: string) => void
}

function formatExpiry(isoDate: string): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString()
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INVITATION: '邀請已過期或無效',
  EMAIL_MISMATCH: '此邀請並非寄送給你的帳號',
  USER_ALREADY_IN_ORG: '你已是該組織成員',
  UNAUTHORIZED: '請重新登入後再試',
}

export function InvitationCard({ invitation, onDeclined }: Props) {
  const { csrfToken: inertiaCsrf } = usePage().props as { csrfToken?: string }
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    setAccepting(true)
    setError(null)
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(invitation.id)}/accept-by-id`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': resolveCsrfTokenForFetch(inertiaCsrf),
        },
        body: '{}',
      })
      const payload = (await response.json()) as { success: boolean; error?: string; message?: string }
      if (payload.success) {
        router.visit('/member/dashboard', { replace: true })
      } else {
        setError(ERROR_MESSAGES[payload.error ?? ''] ?? payload.message ?? '接受邀請失敗，請稍後再試')
      }
    } catch {
      setError('接受邀請失敗，請稍後再試')
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    setDeclining(true)
    setError(null)
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(invitation.id)}/decline`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': resolveCsrfTokenForFetch(inertiaCsrf),
        },
        body: '{}',
      })
      const payload = (await response.json()) as { success: boolean; error?: string; message?: string }
      if (payload.success) {
        onDeclined(invitation.id)
      } else {
        setError(ERROR_MESSAGES[payload.error ?? ''] ?? payload.message ?? '拒絕邀請失敗，請稍後再試')
      }
    } catch {
      setError('拒絕邀請失敗，請稍後再試')
    } finally {
      setDeclining(false)
    }
  }

  return (
    <Card className="border-border rounded-lg bg-white/[0.02] shadow-indigo-500/5 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white">
            {invitation.organizationName || invitation.organizationId}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {invitation.role}
          </Badge>
        </div>
        <CardDescription className="text-white/40">
          邀請加入組織 · 到期日：{formatExpiry(invitation.expiresAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleAccept}
            disabled={accepting || declining}
            className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
          >
            {accepting ? '接受中…' : '接受邀請'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDecline}
            disabled={accepting || declining}
          >
            {declining ? '拒絕中…' : '拒絕'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

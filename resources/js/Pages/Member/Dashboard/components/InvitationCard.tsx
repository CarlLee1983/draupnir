import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import { router } from '@inertiajs/react'
import { resolveCsrfTokenForFetch } from '@/lib/csrf'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTranslation, type MessageKey, type Translator } from '@/lib/i18n'

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

function formatExpiry(isoDate: string, locale: string): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString(locale)
}

function invitationErrorKey(code: string | undefined): MessageKey | null {
  switch (code) {
    case 'INVALID_INVITATION':
      return 'ui.member.invitation.error.INVALID_INVITATION'
    case 'EMAIL_MISMATCH':
      return 'ui.member.invitation.error.EMAIL_MISMATCH'
    case 'USER_ALREADY_IN_ORG':
      return 'ui.member.invitation.error.USER_ALREADY_IN_ORG'
    case 'UNAUTHORIZED':
      return 'ui.member.invitation.error.UNAUTHORIZED'
    default:
      return null
  }
}

export function InvitationCard({ invitation, onDeclined }: Props) {
  const { t, locale } = useTranslation()
  const { csrfToken: inertiaCsrf } = usePage().props as { csrfToken?: string }
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolveError = (tt: Translator, code: string | undefined, message: string | undefined, fallback: MessageKey) => {
    const key = invitationErrorKey(code)
    return key ? tt(key) : message ?? tt(fallback)
  }

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
        setError(resolveError(t, payload.error, payload.message, 'ui.member.invitation.acceptFailed'))
      }
    } catch {
      setError(t('ui.member.invitation.acceptFailed'))
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
        setError(resolveError(t, payload.error, payload.message, 'ui.member.invitation.declineFailed'))
      }
    } catch {
      setError(t('ui.member.invitation.declineFailed'))
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
          {t('ui.member.invitation.cardSubtitle', {
            date: formatExpiry(invitation.expiresAt, locale),
          })}
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
            {accepting ? t('ui.member.invitation.accepting') : t('ui.member.invitation.accept')}
          </Button>
          <Button type="button" variant="outline" onClick={handleDecline} disabled={accepting || declining}>
            {declining ? t('ui.member.invitation.declining') : t('ui.member.invitation.decline')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

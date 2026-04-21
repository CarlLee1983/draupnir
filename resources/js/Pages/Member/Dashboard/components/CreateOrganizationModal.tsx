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
import { useTranslation, type MessageKey } from '@/lib/i18n'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ERROR_CODE_TO_KEY: Record<string, MessageKey> = {
  ADMIN_CANNOT_CREATE_ORG: 'ui.member.createOrganization.error.adminCannotCreate',
  SLUG_EXISTS: 'ui.member.createOrganization.error.slugExists',
  NAME_REQUIRED: 'ui.member.createOrganization.error.nameRequired',
  MANAGER_NOT_FOUND: 'ui.member.createOrganization.error.managerNotFound',
  CSRF_MISMATCH: 'ui.member.createOrganization.error.csrfMismatch',
  PROVISION_FAILED: 'ui.member.createOrganization.error.provisionFailed',
}

export function CreateOrganizationModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { csrfToken: inertiaCsrf } = usePage().props
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = (): MessageKey | null => {
    if (name.trim().length < 2) return 'ui.member.createOrganization.validation.nameTooShort'
    if (name.trim().length > 64) return 'ui.member.createOrganization.validation.nameTooLong'
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const validationKey = validate()
    if (validationKey) {
      setError(t(validationKey))
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
          'X-CSRF-Token': resolveCsrfTokenForFetch(
            typeof inertiaCsrf === 'string' ? inertiaCsrf : undefined,
          ),
        },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (response.status === 419) {
        setError(t('ui.member.createOrganization.error.csrfMismatch'))
        return
      }

      const payload = (await response.json()) as {
        success: boolean
        error?: string
        message?: string
        data?: { redirectTo?: string }
      }

      if (payload.success) {
        router.visit(payload.data?.redirectTo ?? '/member/dashboard', { replace: true })
      } else if (payload.error === 'ALREADY_HAS_ORGANIZATION') {
        // Stale UI (e.g. another tab already created org); reload props from server
        router.visit('/member/dashboard', { replace: true })
      } else {
        const key = payload.error ? ERROR_CODE_TO_KEY[payload.error] : undefined
        setError(key ? t(key) : payload.message ?? t('ui.member.createOrganization.error.generic'))
      }
    } catch {
      setError(t('ui.member.createOrganization.error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('ui.member.createOrganization.title')}</DialogTitle>
          <DialogDescription>{t('ui.member.createOrganization.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">{t('ui.member.createOrganization.nameLabel')}</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('ui.member.createOrganization.namePlaceholder')}
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
              {t('ui.member.createOrganization.cancel')}
            </Button>
            <Button type="submit" disabled={submitting || name.trim().length < 2}>
              {submitting
                ? t('ui.member.createOrganization.submitting')
                : t('ui.member.createOrganization.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

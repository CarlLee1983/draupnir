import type { I18nMessage, Messages } from '@/lib/i18n'

export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'manager' | 'member'
}

export interface SharedProps {
  auth: {
    user: AuthUser | null
  }
  currentOrgId: string | null
  locale: string
  messages: Partial<Messages>
  flash: {
    success?: I18nMessage
    error?: I18nMessage
  }
}

declare module '@inertiajs/react' {
  interface PageProps extends SharedProps {}
}

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
  flash: {
    success?: string
    error?: string
  }
}

declare module '@inertiajs/react' {
  interface PageProps extends SharedProps {}
}

import { usePage } from '@inertiajs/react'
import type { SharedProps } from '@/types/inertia'

function sharedProps() {
  return usePage().props as unknown as SharedProps
}

export function useAuth() {
  const { auth } = sharedProps()
  return auth
}

export function useUser() {
  const { auth } = sharedProps()
  if (!auth.user) {
    throw new Error('useUser() called without authenticated user')
  }
  return auth.user
}

export function useIsAdmin() {
  const { auth } = sharedProps()
  return auth.user?.role === 'admin'
}

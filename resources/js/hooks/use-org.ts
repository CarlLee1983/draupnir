import { usePage } from '@inertiajs/react'
import type { SharedProps } from '@/types/inertia'

export function useCurrentOrgId() {
  const { currentOrgId } = usePage().props as unknown as SharedProps
  return currentOrgId
}

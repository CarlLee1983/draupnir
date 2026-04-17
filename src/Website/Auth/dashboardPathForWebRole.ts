/**
 * Inertia web area: post-login / session landing path by JWT `role` claim.
 * Unknown roles fall back to the member dashboard (same as login redirect).
 */
export function dashboardPathForWebRole(role: string): string {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'manager') return '/manager/dashboard'
  return '/member/api-keys'
}

/**
 * Container binding keys for Auth Inertia pages.
 */
export const AUTH_PAGE_KEYS = {
  login: 'page:auth:login',
  register: 'page:auth:register',
  forgotPassword: 'page:auth:forgotPassword',
  resetPassword: 'page:auth:resetPassword',
  emailVerification: 'page:auth:emailVerification',
  googleOAuthCallback: 'page:auth:googleOAuthCallback',
} as const

export type AuthPageBindingKey = (typeof AUTH_PAGE_KEYS)[keyof typeof AUTH_PAGE_KEYS]

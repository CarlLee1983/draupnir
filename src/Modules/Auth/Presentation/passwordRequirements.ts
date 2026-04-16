/**
 * Shared password policy for registration, reset, and in-session password change UIs.
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresNumbers: true,
} as const

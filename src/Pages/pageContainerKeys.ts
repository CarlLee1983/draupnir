/**
 * DI container keys for the Inertia presentation shell.
 *
 * Per-page singletons use `ADMIN_PAGE_KEYS` / `MEMBER_PAGE_KEYS` in
 * `registerAdminPageBindings` and `registerMemberPageBindings`.
 */
export const PAGE_CONTAINER_KEYS = {
  inertiaService: 'inertiaService',
} as const

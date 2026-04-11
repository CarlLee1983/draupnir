// src/Modules/Organization/Presentation/Requests/params.ts
import { z } from '@gravito/impulse'

export const OrganizationIdSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
})

export const OrganizationMemberParamsSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
  userId: z.string().uuid('Invalid user ID'),
})

export const OrganizationInvitationParamsSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
  invId: z.string().min(1, 'Invitation ID is required'),
})

export const OrganizationAuthHeaderSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
})

export type OrganizationIdParams = z.infer<typeof OrganizationIdSchema>
export type OrganizationMemberParams = z.infer<typeof OrganizationMemberParamsSchema>
export type OrganizationInvitationParams = z.infer<typeof OrganizationInvitationParamsSchema>
export type OrganizationAuthHeaderParams = z.infer<typeof OrganizationAuthHeaderSchema>

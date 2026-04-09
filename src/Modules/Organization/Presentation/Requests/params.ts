// src/Modules/Organization/Presentation/Requests/params.ts
import { z } from '@gravito/impulse'

export const OrganizationIdSchema = z.object({
  id: z.string().uuid('無效的組織 ID'),
})

export const OrganizationMemberParamsSchema = z.object({
  id: z.string().uuid('無效的組織 ID'),
  userId: z.string().uuid('無效的使用者 ID'),
})

export const OrganizationInvitationParamsSchema = z.object({
  id: z.string().uuid('無效的組織 ID'),
  invId: z.string().min(1, '邀請 ID 不能為空'),
})

export const OrganizationAuthHeaderSchema = z.object({
  organizationId: z.string().uuid('無效的組織 ID'),
})

export type OrganizationIdParams = z.infer<typeof OrganizationIdSchema>
export type OrganizationMemberParams = z.infer<typeof OrganizationMemberParamsSchema>
export type OrganizationInvitationParams = z.infer<typeof OrganizationInvitationParamsSchema>
export type OrganizationAuthHeaderParams = z.infer<typeof OrganizationAuthHeaderSchema>

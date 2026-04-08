import { z } from 'zod'

export const InviteMemberSchema = z.object({
  email: z.string().email('電子郵件格式無效'),
  role: z.string().optional()
})

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token 不能為空')
})

export const ChangeMemberRoleSchema = z.object({
  role: z.string().min(1, '角色不能為空')
})

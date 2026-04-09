import { z } from 'zod'

export const UpdateUserProfileSchema = z.object({
  displayName: z.string().min(1, '顯示名稱不能為空').max(50, '顯示名稱太長').optional(),
  avatarUrl: z.string().url('頭像 URL 格式無效').nullable().optional(),
  phone: z.string()
    .regex(/^\+?[0-9\s-]{7,15}$/, '電話號碼格式無效')
    .nullable().optional(),
  bio: z.string().max(255, '個人簡介太長').nullable().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  notificationPreferences: z.record(z.string(), z.any()).optional(),
})

export type UpdateUserProfileParams = z.infer<typeof UpdateUserProfileSchema>

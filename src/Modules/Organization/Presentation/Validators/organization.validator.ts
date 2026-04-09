import { z } from 'zod'

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1, '組織名稱不能為空').max(100, '組織名稱太長'),
  description: z.string().max(255, '描述太長').optional(),
  slug: z.string()
    .min(3, 'Slug 至少需要 3 個字符')
    .max(50, 'Slug 太長')
    .regex(/^[a-z0-9-]+$/, 'Slug 只能包含小寫字母、數字和橫線')
    .optional(),
  managerUserId: z.string().uuid('無效的用戶 ID')
})

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1, '組織名稱不能為空').max(100, '組織名稱太長').optional(),
  description: z.string().max(255, '描述太長').optional()
})

export const ChangeOrgStatusSchema = z.object({
  status: z.enum(['active', 'suspended'], {
    error: '無效的狀態值'
  })
})

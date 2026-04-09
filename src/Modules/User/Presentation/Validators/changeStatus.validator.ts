import { z } from 'zod'

export const ChangeUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended'], {
    error: '無效的狀態值'
  })
})

export type ChangeUserStatusParams = z.infer<typeof ChangeUserStatusSchema>

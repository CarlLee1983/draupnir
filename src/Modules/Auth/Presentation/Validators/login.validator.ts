import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('電子郵件格式無效'),
  password: z.string().min(1, '密碼不能為空'),
})

export type LoginParams = z.infer<typeof LoginSchema>

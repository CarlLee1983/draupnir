// src/Modules/Auth/Presentation/Requests/RegisterRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class RegisterRequest extends FormRequest {
  schema = z.object({
    email: z.string().email('電子郵件格式無效'),
    password: z.string()
      .min(8, '密碼至少需要 8 個字符')
      .regex(/[A-Z]/, '密碼必須包含至少一個大寫字母')
      .regex(/[a-z]/, '密碼必須包含至少一個小寫字母')
      .regex(/[0-9]/, '密碼必須包含至少一個數字'),
    confirmPassword: z.string().optional(),
  }).refine((data) => {
    if (data.confirmPassword && data.password !== data.confirmPassword) return false
    return true
  }, { message: '密碼不匹配', path: ['confirmPassword'] })
}

export type RegisterParams = z.infer<RegisterRequest['schema']>

// src/Modules/Auth/Presentation/Requests/LoginRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class LoginRequest extends FormRequest {
  schema = z.object({
    email: z.string().email('電子郵件格式無效'),
    password: z.string().min(1, '密碼不能為空'),
  })
}

export type LoginParams = z.infer<LoginRequest['schema']>

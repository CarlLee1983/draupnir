// src/Modules/AppModule/Presentation/Requests/RegisterModuleRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class RegisterModuleRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(1, '名稱為必填'),
    description: z.string().optional(),
    type: z.enum(['free', 'paid']),
  })
}

export type RegisterModuleParams = z.infer<RegisterModuleRequest['schema']>

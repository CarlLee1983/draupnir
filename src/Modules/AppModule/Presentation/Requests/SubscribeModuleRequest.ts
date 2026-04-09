// src/Modules/AppModule/Presentation/Requests/SubscribeModuleRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class SubscribeModuleRequest extends FormRequest {
  schema = z.object({
    moduleId: z.string().min(1, '模組 ID 為必填'),
  })
}

export type SubscribeModuleParams = z.infer<SubscribeModuleRequest['schema']>

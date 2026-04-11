// src/Modules/AppModule/Presentation/Requests/SubscribeModuleRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class SubscribeModuleRequest extends FormRequest {
  schema = z.object({
    moduleId: z.string().min(1, 'Module ID is required'),
  })
}

export type SubscribeModuleParams = z.infer<SubscribeModuleRequest['schema']>

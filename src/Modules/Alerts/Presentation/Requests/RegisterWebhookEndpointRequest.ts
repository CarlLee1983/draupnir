import { FormRequest, z } from '@gravito/impulse'

export class RegisterWebhookEndpointRequest extends FormRequest {
  schema = z.object({
    url: z.string().url().max(2048),
    description: z.string().max(200).optional().nullable(),
  })
}

export type RegisterWebhookEndpointInput = z.infer<RegisterWebhookEndpointRequest['schema']>

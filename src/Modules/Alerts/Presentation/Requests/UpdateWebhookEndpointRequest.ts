import { FormRequest, z } from '@gravito/impulse'

export class UpdateWebhookEndpointRequest extends FormRequest {
  schema = z.object({
    active: z.boolean().optional(),
    description: z.string().max(200).optional().nullable(),
  })
}

export type UpdateWebhookEndpointInput = z.infer<UpdateWebhookEndpointRequest['schema']>

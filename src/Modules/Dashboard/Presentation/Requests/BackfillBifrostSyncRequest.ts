import { FormRequest, z } from '@gravito/impulse'

export class BackfillBifrostSyncRequest extends FormRequest {
  schema = z.object({
    startTime: z.string().min(1, 'startTime is required'),
    endTime: z.string().min(1, 'endTime is required'),
  })
}

export type BackfillBifrostSyncParams = z.infer<BackfillBifrostSyncRequest['schema']>

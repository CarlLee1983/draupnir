// src/Modules/Organization/Presentation/Requests/ChangeMemberRoleRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class ChangeMemberRoleRequest extends FormRequest {
  schema = z.object({
    role: z.string().min(1, '角色不能為空'),
  })
}

export type ChangeMemberRoleParams = z.infer<ChangeMemberRoleRequest['schema']>

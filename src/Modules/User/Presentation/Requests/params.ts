// src/Modules/User/Presentation/Requests/params.ts
import { z } from '@gravito/impulse'

export const UserIdSchema = z.object({
  id: z.string().uuid('無效的使用者 ID'),
})

export type UserIdParams = z.infer<typeof UserIdSchema>

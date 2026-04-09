import { z } from 'zod'

export const ListUsersQuerySchema = z.object({
	role: z.string().optional(),
	status: z.enum(['active', 'suspended']).optional(),
	keyword: z.string().optional(),
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().max(100).optional(),
})

export type ListUsersQueryParams = z.infer<typeof ListUsersQuerySchema>

export const UserIdSchema = z.object({
	id: z.string().uuid('無效的使用者 ID'),
})

export type UserIdParams = z.infer<typeof UserIdSchema>

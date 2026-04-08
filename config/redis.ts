/**
 * Redis configuration for @gravito/plasma (OrbitPlasma).
 * Used by cache (Stasis redis store), session, queue, etc.
 */
export default {
	default: 'default',
	connections: {
		default: {
			host: process.env.REDIS_HOST ?? '127.0.0.1',
			port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
			password:
				process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.length > 0
					? process.env.REDIS_PASSWORD
					: undefined,
		},
	},
} as const

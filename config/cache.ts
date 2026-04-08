/**
 * Cache configuration for @gravito/stasis (optional).
 * Supported drivers: 'memory', 'file', 'redis'.
 */
export default {
	default: process.env.CACHE_DRIVER ?? 'memory',
	stores: {
		memory: {
			driver: 'memory',
			maxItems: 10_000,
		},
		file: {
			driver: 'file',
			directory: process.env.CACHE_PATH ?? 'storage/framework/cache',
		},
		redis: {
			driver: 'redis',
			connection: process.env.REDIS_CACHE_CONNECTION ?? 'default',
			prefix: process.env.REDIS_CACHE_PREFIX ?? 'cache:',
		},
	},
} as const

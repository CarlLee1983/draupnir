/**
 * Database configuration for @gravito/atlas.
 * Used only when ENABLE_DB is not 'false'.
 */
export default {
	default: process.env.DB_CONNECTION ?? 'sqlite',
	connections: {
		sqlite: {
			driver: 'sqlite',
			database: process.env.DB_DATABASE ?? 'database/database.sqlite',
		},
		postgres: {
			driver: 'postgres',
			host: process.env.DB_HOST ?? '127.0.0.1',
			port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
			database: process.env.DB_DATABASE ?? 'gravito',
			username: process.env.DB_USERNAME ?? 'postgres',
			password: process.env.DB_PASSWORD ?? '',
			charset: 'utf8',
			search_path: 'public',
			sslmode: process.env.DB_SSLMODE ?? 'prefer',
		},
		mysql: {
			driver: 'mysql',
			host: process.env.DB_HOST ?? '127.0.0.1',
			port: Number.parseInt(process.env.DB_PORT ?? '3306', 10),
			database: process.env.DB_DATABASE ?? 'gravito',
			username: process.env.DB_USERNAME ?? 'root',
			password: process.env.DB_PASSWORD ?? '',
			charset: 'utf8mb4',
			collation: 'utf8mb4_unicode_ci',
			useNativeDriver: false, // 使用 mysql2，避免 Bun.sql MySQL 的 .unsafe API 問題
		},
	},
} as const

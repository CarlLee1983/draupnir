/**
 * Auth 資料倉儲實現 (ORM 無關)
 *
 * 設計：
 * - 依賴 IDatabaseAccess（由上層注入；實作由 Shared 的 DatabaseAccessBuilder / 適配器指定）
 * - 完全實現 IAuthRepository，僅透過 Port 抽象，無底層 if (db) 分支
 *
 * @see docs/05-Database-ORM/ORM_TRANSPARENT_DESIGN.md
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import { User } from '../../Domain/Aggregates/User'
import type { Email } from '../../Domain/ValueObjects/Email'

export class AuthRepository implements IAuthRepository {
	constructor(private readonly db: IDatabaseAccess) {}

	async findById(id: string): Promise<User | null> {
		const row = await this.db.table('users').where('id', '=', id).first()
		return row ? User.fromDatabase(row) : null
	}

	async findByEmail(email: Email): Promise<User | null> {
		const row = await this.db
			.table('users')
			.where('email', '=', email.getValue())
			.first()
		return row ? User.fromDatabase(row) : null
	}

	async emailExists(email: Email): Promise<boolean> {
		const count = await this.db
			.table('users')
			.where('email', '=', email.getValue())
			.count()
		return count > 0
	}

	async save(user: User): Promise<void> {
		const existing = await this.findById(user.id)
		if (existing) {
			await this.db.table('users').where('id', '=', user.id).update(user.toDatabaseRow())
		} else {
			await this.db.table('users').insert(user.toDatabaseRow())
		}
	}

	async delete(id: string): Promise<void> {
		await this.db.table('users').where('id', '=', id).delete()
	}

	async findAll(limit?: number, offset?: number): Promise<User[]> {
		let query = this.db.table('users')
		if (offset) query = query.offset(offset)
		if (limit) query = query.limit(limit)
		const rows = await query.select()
		return rows.map((row) => User.fromDatabase(row))
	}
}

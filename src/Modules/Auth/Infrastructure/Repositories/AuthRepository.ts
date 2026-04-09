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
import { Email } from '../../Domain/ValueObjects/Email'
import { Password } from '../../Domain/ValueObjects/Password'
import { Role } from '../../Domain/ValueObjects/Role'
import { UserStatus } from '../../Domain/Aggregates/User'

export class AuthRepository implements IAuthRepository {
	constructor(private readonly db: IDatabaseAccess) {}

	async findById(id: string): Promise<User | null> {
		const row = await this.db.table('users').where('id', '=', id).first()
		return row ? this.mapRowToUser(row) : null
	}

	async findByEmail(email: Email): Promise<User | null> {
		const row = await this.db
			.table('users')
			.where('email', '=', email.getValue())
			.first()
		return row ? this.mapRowToUser(row) : null
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
		const row = this.mapUserToRow(user)
		if (existing) {
			await this.db.table('users').where('id', '=', user.id).update(row)
		} else {
			await this.db.table('users').insert(row)
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
		return rows.map((row) => this.mapRowToUser(row))
	}

	private mapRowToUser(row: Record<string, unknown>): User {
		return User.reconstitute({
			id: String(row.id),
			email: new Email(String(row.email)),
			password: Password.fromHashed(String(row.password)),
			role: this.mapRole(row.role),
			status: this.mapStatus(row.status),
			createdAt: this.toDate(row.created_at),
			updatedAt: this.toDate(row.updated_at),
		})
	}

	private mapUserToRow(user: User): Record<string, unknown> {
		return {
			id: user.id,
			email: user.emailValue,
			password: user.password.getHashed(),
			role: user.role.getValue(),
			status: user.status,
			created_at: user.createdAt.toISOString(),
			updated_at: user.updatedAt.toISOString(),
		}
	}

	private mapRole(role: unknown): Role {
		if (role === 'user' || role === 'guest') {
			return Role.member()
		}

		if (typeof role === 'string') {
			return new Role(role)
		}

		return Role.member()
	}

	private mapStatus(status: unknown): UserStatus {
		switch (status) {
			case UserStatus.INACTIVE:
				return UserStatus.INACTIVE
			case UserStatus.SUSPENDED:
				return UserStatus.SUSPENDED
			default:
				return UserStatus.ACTIVE
		}
	}

	private toDate(value: unknown): Date {
		return value instanceof Date ? new Date(value) : new Date(String(value))
	}
}

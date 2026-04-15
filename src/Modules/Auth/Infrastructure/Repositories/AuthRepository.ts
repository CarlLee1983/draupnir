/**
 * Auth repository implementation (ORM-agnostic).
 *
 * Design:
 * - Depends on `IDatabaseAccess` injected from wiring (concrete adapter from Shared).
 * - Implements `IAuthRepository` only through the database port (no `if (db)` branching).
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { User, UserStatus } from '../../Domain/Aggregates/User'
import type { IAuthRepository, UserListFilters } from '../../Domain/Repositories/IAuthRepository'
import { Email } from '../../Domain/ValueObjects/Email'
import { Password } from '../../Domain/ValueObjects/Password'
import { Role } from '../../Domain/ValueObjects/Role'

/**
 * Concrete implementation of IAuthRepository using an ORM-agnostic database access layer.
 */
export class AuthRepository implements IAuthRepository {
  /**
   * Creates an instance of AuthRepository.
   */
  constructor(private readonly db: IDatabaseAccess) {}

  /**
   * Finds a user by their unique identifier.
   */
  async findById(id: string): Promise<User | null> {
    const row = await this.db.table('users').where('id', '=', id).first()
    return row ? this.mapRowToUser(row) : null
  }

  /**
   * Finds a user by their registered email address.
   */
  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.db.table('users').where('email', '=', email.getValue()).first()
    return row ? this.mapRowToUser(row) : null
  }

  /**
   * Finds a user by linked Google OAuth subject id.
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.db.table('users').where('google_id', '=', googleId).first()
    return row ? this.mapRowToUser(row) : null
  }

  /**
   * Checks if a user with the given email already exists in the system.
   */
  async emailExists(email: Email): Promise<boolean> {
    const count = await this.db.table('users').where('email', '=', email.getValue()).count()
    return count > 0
  }

  /**
   * Persists a user aggregate to the database (upsert).
   */
  async save(user: User): Promise<void> {
    const existing = await this.findById(user.id)
    const row = this.mapUserToRow(user)
    if (existing) {
      await this.db.table('users').where('id', '=', user.id).update(row)
    } else {
      await this.db.table('users').insert(row)
    }
  }

  /**
   * Deletes a user account from the system.
   */
  async delete(id: string): Promise<void> {
    await this.db.table('users').where('id', '=', id).delete()
  }

  /**
   * Retrieves all users matching the given filters, ordered by createdAt DESC.
   * role and status are applied as SQL WHERE conditions; limit/offset control pagination.
   */
  async findAll(filters?: UserListFilters): Promise<User[]> {
    let query = this.db.table('users').orderBy('created_at', 'DESC')
    if (filters?.role) query = query.where('role', '=', filters.role)
    if (filters?.status) query = query.where('status', '=', filters.status)
    if (filters?.offset !== undefined) query = query.offset(filters.offset)
    if (filters?.limit !== undefined) query = query.limit(filters.limit)
    const rows = await query.select()
    return rows.map((row) => this.mapRowToUser(row))
  }

  /**
   * Returns the total count of users matching the given role/status filters.
   * Used for server-side pagination metadata.
   */
  async countAll(filters?: UserListFilters): Promise<number> {
    let query = this.db.table('users')
    if (filters?.role) query = query.where('role', '=', filters.role)
    if (filters?.status) query = query.where('status', '=', filters.status)
    return query.count()
  }

  /**
   * Maps a raw database row to a User aggregate.
   */
  private mapRowToUser(row: Record<string, unknown>): User {
    const googleRaw = row.google_id
    return User.reconstitute({
      id: String(row.id),
      email: new Email(String(row.email)),
      password: Password.fromHashed(String(row.password)),
      role: this.mapRole(row.role),
      status: this.mapStatus(row.status),
      googleId: googleRaw != null && String(googleRaw).length > 0 ? String(googleRaw) : null,
      createdAt: this.toDate(row.created_at),
      updatedAt: this.toDate(row.updated_at),
    })
  }

  /**
   * Maps a User aggregate to a raw database row for persistence.
   */
  private mapUserToRow(user: User): Record<string, unknown> {
    return {
      id: user.id,
      email: user.emailValue,
      password: user.password.getHashed(),
      role: user.role.getValue(),
      status: user.status,
      google_id: user.googleId,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    }
  }

  /**
   * Maps a raw role string to a Role value object.
   */
  private mapRole(role: unknown): Role {
    if (role === 'user' || role === 'guest') {
      return Role.member()
    }

    if (typeof role === 'string') {
      return new Role(role)
    }

    return Role.member()
  }

  /**
   * Maps a raw status string to a UserStatus enum value.
   */
  private mapStatus(status: unknown): UserStatus {
    switch (status) {
      case UserStatus.SUSPENDED:
        return UserStatus.SUSPENDED
      default:
        return UserStatus.ACTIVE
    }
  }

  /**
   * Safely converts a database value to a JavaScript Date object.
   */
  private toDate(value: unknown): Date {
    return value instanceof Date ? new Date(value) : new Date(String(value))
  }
}

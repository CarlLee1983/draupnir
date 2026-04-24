import { seedAdminRole } from './admin-seed'
import type { TestClient } from './test-client'

export type AuthRole = 'user' | 'admin'

export interface AuthIdentity {
  token: string
  userId: string
  role: AuthRole
}

const identities: Record<AuthRole, AuthIdentity | null> = {
  user: null,
  admin: null,
}

/**
 * Ensure an authenticated identity exists for the given role.
 */
export async function ensureAuth(
  client: TestClient,
  role: AuthRole = 'user',
): Promise<AuthIdentity> {
  // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
  if (identities[role]) return identities[role]!

  const email = `test-${role}-${crypto.randomUUID().slice(0, 8)}@feature.test`
  const password = 'SecurePass123'

  const regRes = await client.post('/api/auth/register', { email, password })
  if (regRes.status !== 201) {
    throw new Error(`ensureAuth register failed: ${JSON.stringify(regRes.json)}`)
  }
  const userId = (regRes.json as { data?: { id?: string } }).data?.id
  if (!userId) {
    throw new Error(`ensureAuth register missing data.id: ${JSON.stringify(regRes.json)}`)
  }

  if (role === 'admin') {
    await seedAdminRole(client, userId)
  }

  const loginRes = await client.post('/api/auth/login', { email, password })
  if (loginRes.status !== 200) {
    throw new Error(`ensureAuth login failed: ${JSON.stringify(loginRes.json)}`)
  }

  const token = (loginRes.json as { data?: { accessToken?: string } }).data?.accessToken
  if (!token) {
    throw new Error(`ensureAuth login missing accessToken: ${JSON.stringify(loginRes.json)}`)
  }

  const identity: AuthIdentity = {
    token,
    userId,
    role,
  }
  identities[role] = identity
  return identity
}

export function resetAuth(): void {
  identities.user = null
  identities.admin = null
}

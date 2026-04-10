import type { TestClient } from './test-client'

/**
 * Seed a user as admin by calling the test-only endpoint.
 * This endpoint only exists when ORM=memory.
 */
export async function seedAdminRole(client: TestClient, userId: string): Promise<void> {
  const res = await client.request(
    { method: 'patch', path: '/api/__test__/seed-role' },
    { body: { userId, role: 'admin' } },
  )
  if (res.status !== 200) {
    throw new Error(`Failed to seed admin role for ${userId}: ${JSON.stringify(res.json)}`)
  }
}

import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
// If copied into tests/Acceptance/UseCases/<Module>/, change this import to '../../support/TestApp'.
import { TestApp } from '../support/TestApp'

describe('[Module] [business flow]', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
  })

  it('[business-readable scenario]', async () => {
    // Given: create real state via app.seed, app.db, or business-level helpers.

    // When: execute the user/system action through real application services or app.http.

    // Then: assert observable business results, not only success flags.
    throw new Error('TODO: replace template body with real acceptance assertions')
  })
})

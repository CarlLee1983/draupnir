const FEATURE_TEST_PORT_START = 34001
const FEATURE_TEST_PORT_END = 34100

async function main(): Promise<void> {
  const testFiles = listFeatureTestFiles()
  const mode = getFeatureTestMode()

  if (mode === 'existing') {
    await runTests(getRequiredBaseURL(), testFiles)
    return
  }

  const externalBaseURL = process.env.API_BASE_URL?.trim()
  if (mode === 'auto' && externalBaseURL) {
    await runTests(externalBaseURL, testFiles)
    return
  }

  for (let port = FEATURE_TEST_PORT_START; port <= FEATURE_TEST_PORT_END; port += 1) {
    const baseURL = `http://127.0.0.1:${port}`
    const server = Bun.spawn(['bun', 'run', 'src/index.ts'], {
      env: {
        ...process.env,
        ORM: 'memory',
        PORT: String(port),
      },
      stdout: 'inherit',
      stderr: 'inherit',
      cwd: process.cwd(),
    })

    try {
      await waitForReady(`${baseURL}/health`, 60_000, () => server.exitCode !== null)
      await runTests(baseURL, testFiles)
      return
    } catch (error) {
      server.kill()
      await server.exited.catch(() => undefined)

      if (port === FEATURE_TEST_PORT_END) {
        throw error
      }

      if (error instanceof Error && error.message.includes('Feature test server')) {
        continue
      }

      throw error
    }
  }

  throw new Error(
    `Unable to start feature test server in range ${FEATURE_TEST_PORT_START}-${FEATURE_TEST_PORT_END}`,
  )
}

async function runTests(baseURL: string, testFiles: string[]): Promise<void> {
  const tests = Bun.spawn(['bun', 'test', ...testFiles.map((file) => `./${file}`)], {
    env: {
      ...process.env,
      API_BASE_URL: baseURL,
    },
    stdout: 'inherit',
    stderr: 'inherit',
    cwd: process.cwd(),
  })

  const exitCode = await tests.exited
  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}

function getFeatureTestMode(): 'auto' | 'server' | 'existing' {
  const mode = process.env.FEATURE_TEST_MODE?.trim() || 'auto'
  if (mode === 'auto' || mode === 'server' || mode === 'existing') {
    return mode
  }

  throw new Error(
    `Invalid FEATURE_TEST_MODE value: ${mode}. Expected auto, server, or existing.`,
  )
}

function getRequiredBaseURL(): string {
  const baseURL = process.env.API_BASE_URL?.trim()
  if (!baseURL) {
    throw new Error(
      'API_BASE_URL is required for feature tests. Set it or use bun run test:feature:server.',
    )
  }
  return baseURL
}

function listFeatureTestFiles(): string[] {
  const files = Bun.spawnSync(['rg', '--files', 'tests/Feature', '-g', '*.e2e.ts'], {
    stdout: 'pipe',
    stderr: 'inherit',
  })

  if (files.exitCode !== 0) {
    throw new Error('Failed to discover feature test files.')
  }

  const testFiles = new TextDecoder()
    .decode(files.stdout)
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
    .sort()

  if (testFiles.length === 0) {
    throw new Error('No feature test files found under tests/Feature.')
  }

  return testFiles
}

async function waitForReady(
  url: string,
  timeoutMs: number,
  isDead?: () => boolean,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (isDead?.()) {
      throw new Error(`Feature test server exited before becoming ready: ${url}`)
    }

    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // Server not ready yet.
    }

    await Bun.sleep(250)
  }

  throw new Error(`Feature test server did not become ready: ${url}`)
}

await main()

# @draupnir/bifrost-sdk

Standalone SDK package for the Bifrost AI Gateway client.

## Usage

```typescript
import { BifrostClient, createBifrostClientConfig } from '@draupnir/bifrost-sdk'

const config = createBifrostClientConfig({
  baseUrl: 'https://your-bifrost-instance.com',
  masterKey: 'your-master-key',
})
const client = new BifrostClient(config)
```

## Development

```bash
bun test          # Run smoke tests
bun run typecheck # Type check
bun run build     # Build to dist/
```

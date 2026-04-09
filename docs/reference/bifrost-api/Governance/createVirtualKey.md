# Create virtual key

Creates a new virtual key with the specified configuration.

## HTTP Request

`POST /api/governance/virtual-keys`

### Request Body

```yaml
Object
  - `name` (string)
  - `description` (string)
  - `provider_configs` (array) - Provider configurations (empty means no providers allowed, deny-by-default)
  - `mcp_configs` (array) - MCP configurations (empty means no MCP tools allowed, deny-by-default)
  - `team_id` (string)
  - `customer_id` (string)
  - `budget` (object) - Create budget request
  - `rate_limit` (object) - Create rate limit request
  - `is_active` (boolean)
```

### Responses

#### 200
Virtual key created successfully

#### 400
Bad request

#### 500
Internal server error


# Update virtual key

Updates an existing virtual key's configuration.

## HTTP Request

`PUT /api/governance/virtual-keys/{vk_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| vk_id | path | string | Virtual key ID |

### Request Body

```yaml
Object
  - `name` (string)
  - `description` (string)
  - `provider_configs` (array)
  - `mcp_configs` (array)
  - `team_id` (string)
  - `customer_id` (string)
  - `budget` (object) - Update budget request
  - `rate_limit` (object) - Update rate limit request
  - `is_active` (boolean)
```

### Responses

#### 200
Virtual key updated successfully

#### 400
Bad request

#### 404
Virtual key not found

#### 500
Internal server error


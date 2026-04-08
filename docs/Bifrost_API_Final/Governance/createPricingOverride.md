# Create pricing override

Creates a new pricing override. The most specific matching scope always wins during cost resolution.

## HTTP Request

`POST /api/governance/pricing-overrides`

### Request Body

```yaml
Object
  - `name` (string) - Human-readable label
  - `scope_kind` (string)
  - `virtual_key_id` (string) - Required for virtual_key* scopes
  - `provider_id` (string) - Required for provider and virtual_key_provider scopes
  - `provider_key_id` (string) - Required for provider_key and virtual_key_provider_key scopes
  - `match_type` (string)
  - `pattern` (string) - Model name or wildcard prefix ending with * (e.g. "claude-3*")
  - `request_types` (array) - Request types this override applies to. At least one value is required.
  - `patch` (object) - Pricing fields to override. Only non-zero/non-null fields are applied. All values are cost per unit in USD.
```

### Responses

#### 201
Pricing override created successfully

#### 400
Bad request

#### 500
Internal server error


# Update pricing override

Updates an existing pricing override. Omitted fields are merged from the existing record. The `patch` field is always replaced in full when provided.

## HTTP Request

`PUT /api/governance/pricing-overrides/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string | Pricing override ID |

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
  - `request_types` (array) - Request types this override applies to.
  - `patch` (object) - Pricing fields to override. Only non-zero/non-null fields are applied. All values are cost per unit in USD.
```

### Responses

#### 200
Pricing override updated successfully

#### 400
Bad request

#### 404
Pricing override not found

#### 500
Internal server error


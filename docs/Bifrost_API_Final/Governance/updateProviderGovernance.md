# Update provider governance

Updates governance settings (budget and rate limits) for a specific provider.

## HTTP Request

`PUT /api/governance/providers/{provider_name}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider_name | path | string | Provider name |

### Request Body

```yaml
Object
  - `budget` (object) - Budget configuration
  - `rate_limit` (object) - Rate limit configuration
```

### Responses

#### 200
Provider governance updated successfully

#### 400
Bad request

#### 404
Provider not found

#### 500
Internal server error


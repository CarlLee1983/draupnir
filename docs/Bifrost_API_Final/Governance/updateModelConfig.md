# Update model config

Updates an existing model configuration's budget and rate limit settings.

## HTTP Request

`PUT /api/governance/model-configs/{mc_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| mc_id | path | string | Model config ID |

### Request Body

```yaml
Object
  - `model_name` (string) - Name of the model
  - `provider` (string) - Provider name
  - `budget` (object) - Budget configuration
  - `rate_limit` (object) - Rate limit configuration
```

### Responses

#### 200
Model config updated successfully

#### 400
Bad request

#### 404
Model config not found

#### 500
Internal server error


# Create model config

Creates a new model configuration with budget and rate limit settings.

## HTTP Request

`POST /api/governance/model-configs`

### Request Body

```yaml
Object
  - `model_name` (string) - Name of the model (required)
  - `provider` (string) - Provider name (optional - applies to all providers if not specified)
  - `budget` (object) - Budget configuration
  - `rate_limit` (object) - Rate limit configuration
```

### Responses

#### 200
Model config created successfully

#### 400
Bad request

#### 500
Internal server error


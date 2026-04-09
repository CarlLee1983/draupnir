# Get model config

Returns a specific model configuration by ID.

## HTTP Request

`GET /api/governance/model-configs/{mc_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| mc_id | path | string | Model config ID |

### Responses

#### 200
Successful response

#### 404
Model config not found

#### 500
Internal server error


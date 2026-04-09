# Delete model config

Deletes a model configuration.

## HTTP Request

`DELETE /api/governance/model-configs/{mc_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| mc_id | path | string | Model config ID |

### Responses

#### 200
Model config deleted successfully

#### 404
Model config not found

#### 500
Internal server error


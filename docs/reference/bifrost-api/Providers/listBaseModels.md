# List base models

Returns a list of base models from the model catalog.

## HTTP Request

`GET /api/models/base`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| query | query | string | Filter models by name |
| provider | query | string | Filter by provider |
| limit | query | integer | Maximum number of results to return |

### Responses

#### 200
Successful response

#### 500
Internal server error


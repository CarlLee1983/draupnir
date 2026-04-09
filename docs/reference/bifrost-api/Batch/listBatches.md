# List batch jobs

Lists batch jobs for a provider.


## HTTP Request

`GET /v1/batches`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | query | string | Provider to list batches for |
| limit | query | integer | Maximum number of batches to return |
| after | query | string | Cursor for pagination |
| before | query | string | Cursor for pagination |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


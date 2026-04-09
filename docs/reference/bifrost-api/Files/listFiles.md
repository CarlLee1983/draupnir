# List files

Lists files for a provider.


## HTTP Request

`GET /v1/files`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-model-provider | query | string | Provider to list files for |
| purpose | query | string | Filter by purpose |
| limit | query | integer | Maximum number of files to return |
| after | query | string | Cursor for pagination |
| order | query | string | Sort order (asc/desc) |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


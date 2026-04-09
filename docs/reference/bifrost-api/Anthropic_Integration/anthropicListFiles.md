# List files (Anthropic format)

Lists uploaded files.


## HTTP Request

`GET /anthropic/v1/files`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-model-provider | header | string | Provider to use (defaults to anthropic) |
| limit | query | integer | Maximum files to return |
| after_id | query | string | Cursor for pagination |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


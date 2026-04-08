# List batch jobs (Anthropic format)

Lists batch processing jobs.


## HTTP Request

`GET /anthropic/v1/messages/batches`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-model-provider | header | string | Provider to use (defaults to anthropic) |
| page_size | query | integer | Maximum number of batches to return |
| page_token | query | string | Cursor for pagination |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


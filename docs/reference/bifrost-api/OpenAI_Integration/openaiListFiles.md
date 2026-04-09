# List files (OpenAI format)

Lists uploaded files.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/files`).


## HTTP Request

`GET /openai/v1/files`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| purpose | query | string | Filter by purpose |
| limit | query | integer | Maximum files to return |
| after | query | string | Cursor for pagination |
| order | query | string |  |
| provider | query | string | Filter by provider |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


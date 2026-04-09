# List containers (OpenAI format)

Lists containers for a provider.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/containers`).


## HTTP Request

`GET /openai/v1/containers`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | query | string | Provider to list containers for (defaults to openai) |
| limit | query | integer | Maximum containers to return |
| after | query | string | Cursor for pagination |
| order | query | string | Sort order |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


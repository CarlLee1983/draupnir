# List files in container (OpenAI format)

Lists all files in a container.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/containers/{container_id}/files`).


## HTTP Request

`GET /openai/v1/containers/{container_id}/files`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| container_id | path | string | Container ID |
| provider | query | string | Provider for the container (defaults to openai) |
| limit | query | integer | Maximum files to return |
| after | query | string | Cursor for pagination |
| order | query | string | Sort order |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


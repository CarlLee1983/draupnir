# Get file content from container (OpenAI format)

Downloads the content of a file from a container.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/containers/{container_id}/files/{file_id}/content`).


## HTTP Request

`GET /openai/v1/containers/{container_id}/files/{file_id}/content`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| container_id | path | string | Container ID |
| file_id | path | string | File ID |
| provider | query | string | Provider for the container (defaults to openai) |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


# Retrieve file from container (OpenAI format)

Retrieves metadata for a specific file in a container.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/containers/{container_id}/files/{file_id}`).


## HTTP Request

`GET /openai/v1/containers/{container_id}/files/{file_id}`

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


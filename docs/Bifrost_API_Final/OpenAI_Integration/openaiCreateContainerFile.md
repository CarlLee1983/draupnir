# Create file in container (OpenAI format)

Creates a new file in a container. You can either upload file content directly
via multipart/form-data or reference an existing file by its ID.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/containers/{container_id}/files`).


## HTTP Request

`POST /openai/v1/containers/{container_id}/files`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| container_id | path | string | Container ID |
| provider | query | string | Provider for the container (defaults to openai) |

### Request Body

```yaml
Object
  - `file_id` (string) - The ID of an existing file to copy into the container
  - `file_path` (string) - Optional path for the file within the container
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


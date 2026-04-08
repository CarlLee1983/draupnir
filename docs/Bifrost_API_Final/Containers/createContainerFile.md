# Create a file in a container

Creates a new file in a container. You can either upload file content directly
via multipart/form-data or reference an existing file by its ID.


## HTTP Request

`POST /v1/containers/{container_id}/files`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| container_id | path | string | The ID of the container |
| provider | query | string | The provider of the container |

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


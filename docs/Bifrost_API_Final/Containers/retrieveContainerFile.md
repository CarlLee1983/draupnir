# Retrieve a file from a container

Retrieves metadata for a specific file in a container.


## HTTP Request

`GET /v1/containers/{container_id}/files/{file_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| container_id | path | string | The ID of the container |
| file_id | path | string | The ID of the file |
| provider | query | string | The provider of the container |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


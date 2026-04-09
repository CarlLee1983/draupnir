# Download file content from a container

Downloads the content of a file from a container.


## HTTP Request

`GET /v1/containers/{container_id}/files/{file_id}/content`

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


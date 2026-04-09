# List files in a container

Lists all files in a container.


## HTTP Request

`GET /v1/containers/{container_id}/files`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| container_id | path | string | The ID of the container |
| provider | query | string | The provider of the container |
| limit | query | integer | Maximum number of files to return |
| after | query | string | Cursor for pagination |
| order | query | string | Sort order (asc/desc) |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


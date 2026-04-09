# Delete a container

Deletes a container.


## HTTP Request

`DELETE /v1/containers/{container_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| container_id | path | string | The ID of the container to delete |
| provider | query | string | The provider of the container |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


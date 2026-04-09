# Retrieve a container

Retrieves a specific container by ID.


## HTTP Request

`GET /v1/containers/{container_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| container_id | path | string | The ID of the container to retrieve |
| provider | query | string | The provider of the container |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


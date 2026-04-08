# Delete container (OpenAI format)

Deletes a container.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/containers/{container_id}`).


## HTTP Request

`DELETE /openai/v1/containers/{container_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| container_id | path | string | Container ID to delete |
| provider | query | string | Provider for the container (defaults to openai) |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


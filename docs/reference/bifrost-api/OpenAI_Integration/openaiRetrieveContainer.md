# Retrieve container (OpenAI format)

Retrieves a specific container by ID.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/containers/{container_id}`).


## HTTP Request

`GET /openai/v1/containers/{container_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| container_id | path | string | Container ID |
| provider | query | string | Provider for the container (defaults to openai) |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


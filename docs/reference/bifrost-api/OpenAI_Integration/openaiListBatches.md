# List batch jobs (OpenAI format)

Lists batch processing jobs.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/batches`).


## HTTP Request

`GET /openai/v1/batches`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| limit | query | integer | Maximum number of batches to return |
| after | query | string | Cursor for pagination |
| provider | query | string | Filter by provider |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


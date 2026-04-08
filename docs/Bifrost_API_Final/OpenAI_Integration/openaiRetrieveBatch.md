# Retrieve batch job (OpenAI format)

Retrieves details of a batch processing job.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/batches/{batch_id}`).


## HTTP Request

`GET /openai/v1/batches/{batch_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| batch_id | path | string | Batch job ID |
| provider | query | string | Provider for the batch |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


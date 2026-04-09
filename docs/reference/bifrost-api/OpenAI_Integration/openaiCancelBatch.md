# Cancel batch job (OpenAI format)

Cancels a batch processing job.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/batches/{batch_id}/cancel`).


## HTTP Request

`POST /openai/v1/batches/{batch_id}/cancel`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| batch_id | path | string | Batch job ID to cancel |
| provider | query | string | Provider for the batch |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


# Get batch results (Anthropic format)

Retrieves results of a completed batch job.


## HTTP Request

`GET /anthropic/v1/messages/batches/{batch_id}/results`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| batch_id | path | string | Batch job ID |
| x-model-provider | header | string | Provider for the batch |

### Responses

#### 200
Successful response (JSONL stream)

#### 400
Bad request

#### 500
Internal server error


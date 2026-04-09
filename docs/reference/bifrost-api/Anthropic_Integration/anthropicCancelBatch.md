# Cancel batch job (Anthropic format)

Cancels a batch processing job.


## HTTP Request

`POST /anthropic/v1/messages/batches/{batch_id}/cancel`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| batch_id | path | string | Batch job ID to cancel |
| x-model-provider | header | string | Provider for the batch |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


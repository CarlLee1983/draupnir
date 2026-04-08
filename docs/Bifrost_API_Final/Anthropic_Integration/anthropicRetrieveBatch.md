# Retrieve batch job (Anthropic format)

Retrieves details of a batch processing job.


## HTTP Request

`GET /anthropic/v1/messages/batches/{batch_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| batch_id | path | string | Batch job ID |
| x-model-provider | header | string | Provider for the batch |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


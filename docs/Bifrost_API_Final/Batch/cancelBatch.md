# Cancel a batch job

Cancels a batch job.


## HTTP Request

`POST /v1/batches/{batch_id}/cancel`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| batch_id | path | string | The ID of the batch to cancel |
| provider | query | string | The provider of the batch |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


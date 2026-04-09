# Get batch results

Retrieves results from a completed batch job.


## HTTP Request

`GET /v1/batches/{batch_id}/results`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| batch_id | path | string | The ID of the batch |
| provider | query | string | The provider of the batch |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


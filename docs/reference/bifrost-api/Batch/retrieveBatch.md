# Retrieve a batch job

Retrieves a specific batch job by ID.


## HTTP Request

`GET /v1/batches/{batch_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| batch_id | path | string | The ID of the batch to retrieve |
| provider | query | string | The provider of the batch |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


# Cancel batch inference job (Bedrock format)

Cancels a batch inference job using AWS Bedrock format.


## HTTP Request

`POST /bedrock/model-invocation-jobs/{jobIdentifier}/stop`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| jobIdentifier | path | string | Job identifier to cancel |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


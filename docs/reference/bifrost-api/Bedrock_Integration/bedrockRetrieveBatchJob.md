# Retrieve batch inference job (Bedrock format)

Retrieves a batch inference job using AWS Bedrock format.


## HTTP Request

`GET /bedrock/model-invocation-jobs/{jobIdentifier}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| jobIdentifier | path | string | Job identifier |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


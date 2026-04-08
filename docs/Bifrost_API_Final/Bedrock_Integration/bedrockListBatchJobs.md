# List batch inference jobs (Bedrock format)

Lists batch inference jobs using AWS Bedrock format.


## HTTP Request

`GET /bedrock/model-invocation-jobs`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| maxResults | query | integer | Maximum number of results to return |
| nextToken | query | string | Token for pagination |
| statusEquals | query | string | Filter by status |
| nameContains | query | string | Filter by job name containing this string |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


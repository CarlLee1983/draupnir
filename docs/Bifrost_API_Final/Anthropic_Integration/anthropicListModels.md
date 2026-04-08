# List models (Anthropic format)

Lists available models in Anthropic format.


## HTTP Request

`GET /anthropic/v1/models`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| limit | query | integer | Maximum number of models to return |
| before_id | query | string | Return models before this ID |
| after_id | query | string | Return models after this ID |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


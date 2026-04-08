# List available models

Lists available models. If provider is not specified, lists all models from all configured providers.


## HTTP Request

`GET /v1/models`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | query | string | Filter by provider (e.g., openai, anthropic, bedrock) |
| page_size | query | integer | Maximum number of models to return |
| page_token | query | string | Token for pagination |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


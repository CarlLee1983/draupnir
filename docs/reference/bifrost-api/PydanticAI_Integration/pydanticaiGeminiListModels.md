# List models (PydanticAI - Gemini format)

Lists available models in Google Gemini API format via PydanticAI.


## HTTP Request

`GET /pydanticai/genai/v1beta/models`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| pageSize | query | integer | Maximum number of models to return |
| pageToken | query | string | Page token for pagination |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


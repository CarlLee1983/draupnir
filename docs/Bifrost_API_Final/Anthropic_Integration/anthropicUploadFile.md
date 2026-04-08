# Upload file (Anthropic format)

Uploads a file. Use x-model-provider header to specify the provider.


## HTTP Request

`POST /anthropic/v1/files`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-model-provider | header | string | Provider to use (defaults to anthropic) |

### Request Body

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


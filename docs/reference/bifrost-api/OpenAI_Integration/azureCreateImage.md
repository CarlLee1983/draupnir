# Create image (Azure OpenAI)

Generates images from text prompts using Azure OpenAI deployment.


## HTTP Request

`POST /openai/openai/deployments/{deployment-id}/images/generations`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| deployment-id | path | string | Azure deployment ID |
| api-version | query | string | Azure API version |

### Request Body

```yaml
Object
  - `model` (string) - Model identifier
  - `prompt` (string) - Text prompt to generate image
  - `n` (integer) - Number of images to generate
  - `size` (string) - Size of the generated image
  - `quality` (string) - Quality of the generated image
  - `style` (string) - Style of the generated image
  - `response_format` (string) - Format of the response. This parameter is not supported for streaming requests.
  - `user` (string) - User identifier for tracking
  - `stream` (boolean) - Whether to stream the response. When true, images are sent as base64 chunks via SSE.
  - `fallbacks` (array) - Fallback models to try if primary model fails
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


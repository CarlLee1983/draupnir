# Create image

Generates images from text prompts using OpenAI-compatible format.

**Note:** Azure OpenAI deployments are also supported via the Azure integration endpoint.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/images/generations`).


## HTTP Request

`POST /openai/v1/images/generations`

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
Successful response. Returns JSON for non-streaming requests, or Server-Sent Events (SSE) stream when `stream=true`.
When streaming, each event contains a chunk of the image as base64 data, with the final event having type `image_generation.completed`.


#### 400
Bad request

#### 500
Internal server error


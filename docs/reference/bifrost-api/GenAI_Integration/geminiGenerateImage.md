# Generate image (Gemini format)

For Imagen models, use the `:predict` suffix (e.g., `imagen-3.0-generate-001:predict`).
For Gemini models, use `:generateContent` with `generationConfig.responseModalities: ["IMAGE"]` in the request body.


## HTTP Request

`POST /genai/v1beta/models/{model}:predict`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| model | path | string | Model name with action suffix. For Imagen models, use `:predict` (e.g., `imagen-3.0-generate-001:predict`). For Gemini models with image generation, use `:generateContent` (e.g., `gemini-1.5-pro:generateContent`).  |

### Request Body

```yaml
Object
  - `model` (string) - Model field for explicit model specification
  - `contents` (array) - Content for the model to process
  - `systemInstruction` (object) - System instruction for the model
  - `generationConfig` (object)
  - `safetySettings` (array)
  - `tools` (array)
  - `toolConfig` (object)
  - `cachedContent` (string) - Cached content resource name
  - `labels` (object) - Labels for the request
  - `requests` (array) - Batch embedding requests
  - `fallbacks` (array)
```

### Responses

#### 200
Successful response. Returns JSON with generated image data in `candidates[0].content.parts[0].inlineData`.
When streaming, events are sent via Server-Sent Events (SSE).


#### 400
Bad request

#### 500
Internal server error


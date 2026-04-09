# Stream generate content (Gemini format)

Streams content generation using Google Gemini API format.
The model is specified in the URL path.


## HTTP Request

`POST /genai/v1beta/models/{model}:streamGenerateContent`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| model | path | string | Model name with action (e.g., gemini-pro:streamGenerateContent) |

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
Successful streaming response

#### 400
Bad request

#### 500
Internal server error


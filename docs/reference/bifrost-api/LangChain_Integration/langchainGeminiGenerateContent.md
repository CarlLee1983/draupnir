# Generate content (LangChain - Gemini format)

Generates content using Google Gemini-compatible format via LangChain.


## HTTP Request

`POST /langchain/genai/v1beta/models/{model}:generateContent`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| model | path | string | Model name with action |

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
Successful response

#### 400
Bad request

#### 500
Internal server error


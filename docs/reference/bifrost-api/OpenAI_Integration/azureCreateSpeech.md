# Create speech (Azure OpenAI TTS)

## HTTP Request

`POST /openai/openai/deployments/{deployment-id}/audio/speech`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| deployment-id | path | string | Azure deployment ID |
| api-version | query | string |  |

### Request Body

```yaml
Object
  - `model` (string) - Model identifier (e.g., tts-1, tts-1-hd)
  - `input` (string) - Text to convert to speech
  - `voice` (string) - Voice to use
  - `response_format` (string)
  - `speed` (number)
  - `stream_format` (string) - Set to 'sse' for streaming
  - `fallbacks` (array)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


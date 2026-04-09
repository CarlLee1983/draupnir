# Create speech

Generates audio from the input text. Returns audio data or streams via SSE.


## HTTP Request

`POST /v1/audio/speech`

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format
  - `input` (string) - Text to convert to speech
  - `fallbacks` (array)
  - `stream_format` (string) - Set to "sse" to enable streaming
  - `voice` (any)
  - `instructions` (string)
  - `response_format` (string)
  - `speed` (number)
  - `language_code` (string)
  - `pronunciation_dictionary_locators` (array)
  - `enable_logging` (boolean)
  - `optimize_streaming_latency` (boolean)
  - `with_timestamps` (boolean)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


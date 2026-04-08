# Create speech (LangChain - OpenAI TTS)

Generates audio from text using OpenAI TTS via LangChain.


## HTTP Request

`POST /langchain/v1/audio/speech`

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


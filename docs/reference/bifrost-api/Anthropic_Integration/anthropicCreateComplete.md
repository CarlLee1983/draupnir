# Create completion (Anthropic legacy format)

Creates a text completion using Anthropic's legacy Complete API.
Supports streaming via SSE.


## HTTP Request

`POST /anthropic/v1/complete`

### Request Body

```yaml
Object
  - `model` (string) - Model identifier
  - `prompt` (string) - The prompt to complete
  - `max_tokens_to_sample` (integer) - Maximum tokens to generate
  - `stream` (boolean)
  - `temperature` (number)
  - `top_p` (number)
  - `top_k` (integer)
  - `stop_sequences` (array)
  - `fallbacks` (array)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


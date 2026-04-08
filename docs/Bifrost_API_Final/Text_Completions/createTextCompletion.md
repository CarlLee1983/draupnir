# Create a text completion

Creates a completion for the provided prompt. Supports streaming via SSE.


## HTTP Request

`POST /v1/completions`

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format
  - `prompt` (any) - Prompt input - can be a string or array of strings
  - `fallbacks` (array)
  - `stream` (boolean)
  - `best_of` (integer)
  - `echo` (boolean)
  - `frequency_penalty` (number)
  - `logit_bias` (object)
  - `logprobs` (integer)
  - `max_tokens` (integer)
  - `n` (integer)
  - `presence_penalty` (number)
  - `seed` (integer)
  - `stop` (array)
  - `suffix` (string)
  - `temperature` (number)
  - `top_p` (number)
  - `user` (string)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


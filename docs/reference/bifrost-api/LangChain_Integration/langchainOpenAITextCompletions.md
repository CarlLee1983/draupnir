# Text completions (LangChain - OpenAI format)

Creates a text completion using OpenAI-compatible format via LangChain.
This is the legacy completions API.


## HTTP Request

`POST /langchain/v1/completions`

### Request Body

```yaml
Object
  - `model` (string) - Model identifier
  - `prompt` (any) - The prompt(s) to generate completions for
  - `stream` (boolean) - Whether to stream the response
  - `max_tokens` (integer)
  - `temperature` (number)
  - `top_p` (number)
  - `frequency_penalty` (number)
  - `presence_penalty` (number)
  - `logit_bias` (object)
  - `logprobs` (integer)
  - `n` (integer)
  - `stop` (any)
  - `suffix` (string)
  - `echo` (boolean)
  - `best_of` (integer)
  - `user` (string)
  - `seed` (integer)
  - `fallbacks` (array)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


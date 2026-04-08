# Chat with model (LiteLLM - Cohere format)

Sends a chat request using Cohere-compatible format via LiteLLM.


## HTTP Request

`POST /litellm/cohere/v2/chat`

### Request Body

```yaml
Object
  - `model` (string) - Model to use for chat completion
  - `messages` (array) - Array of message objects
  - `tools` (array)
  - `tool_choice` (string) - Tool choice mode - AUTO lets the model decide, NONE disables tools, REQUIRED forces tool use
  - `temperature` (number)
  - `p` (number) - Top-p sampling
  - `k` (integer) - Top-k sampling
  - `max_tokens` (integer)
  - `stop_sequences` (array)
  - `frequency_penalty` (number)
  - `presence_penalty` (number)
  - `stream` (boolean)
  - `safety_mode` (string)
  - `log_probs` (boolean)
  - `strict_tool_choice` (boolean)
  - `thinking` (object)
  - `response_format` (object)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


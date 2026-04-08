# Invoke model with streaming (Bedrock format)

Invokes a model with streaming using AWS Bedrock InvokeModelWithResponseStream API format.


## HTTP Request

`POST /bedrock/model/{modelId}/invoke-with-response-stream`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| modelId | path | string | Model ID (e.g., anthropic.claude-3-sonnet-20240229-v1:0) |

### Request Body

```yaml
Object
  - `prompt` (string) - Text prompt to complete
  - `max_tokens` (integer)
  - `max_tokens_to_sample` (integer) - Anthropic-style max tokens
  - `temperature` (number)
  - `top_p` (number)
  - `top_k` (integer)
  - `stop` (array)
  - `stop_sequences` (array) - Anthropic-style stop sequences
  - `messages` (array) - For Claude 3 models
  - `system` (any) - System prompt (string or array of strings)
  - `anthropic_version` (string)
```

### Responses

#### 200
Successful streaming response

#### 400
Bad request

#### 500
Internal server error


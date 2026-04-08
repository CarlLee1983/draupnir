# Create response (Azure OpenAI)

## HTTP Request

`POST /openai/openai/deployments/{deployment-id}/responses`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| deployment-id | path | string | Azure deployment ID |
| api-version | query | string |  |

### Request Body

```yaml
Object
  - `model` (string) - Model identifier
  - `input` (any) - Input - can be a string or array of messages
  - `stream` (boolean)
  - `instructions` (string) - System instructions for the model
  - `max_output_tokens` (integer)
  - `metadata` (object)
  - `parallel_tool_calls` (boolean)
  - `previous_response_id` (string)
  - `reasoning` (object)
  - `store` (boolean)
  - `temperature` (number)
  - `text` (object)
  - `tool_choice` (any)
  - `tools` (array)
  - `top_p` (number)
  - `truncation` (string)
  - `user` (string)
  - `fallbacks` (array)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


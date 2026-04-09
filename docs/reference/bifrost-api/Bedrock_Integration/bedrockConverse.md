# Converse with model (Bedrock format)

Sends messages to a model using AWS Bedrock Converse API format.


## HTTP Request

`POST /bedrock/model/{modelId}/converse`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| modelId | path | string | Model ID (e.g., anthropic.claude-3-sonnet-20240229-v1:0) |

### Request Body

```yaml
Object
  - `messages` (array) - Array of messages for the conversation
  - `system` (array) - System messages/prompts
  - `inferenceConfig` (object)
  - `toolConfig` (object)
  - `guardrailConfig` (object)
  - `additionalModelRequestFields` (object) - Model-specific parameters
  - `additionalModelResponseFieldPaths` (array)
  - `performanceConfig` (object)
  - `promptVariables` (object)
  - `requestMetadata` (object)
  - `serviceTier` (object)
  - `fallbacks` (array)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


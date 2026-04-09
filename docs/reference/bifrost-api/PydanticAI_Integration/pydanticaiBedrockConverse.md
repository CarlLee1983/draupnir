# Converse with model (PydanticAI - Bedrock format)

Sends messages using AWS Bedrock Converse-compatible format via PydanticAI.


## HTTP Request

`POST /pydanticai/bedrock/model/{modelId}/converse`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| modelId | path | string | Model ID |

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


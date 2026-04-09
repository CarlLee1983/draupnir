# Stream converse with model (LangChain - Bedrock format)

Streams messages using AWS Bedrock Converse-compatible format via LangChain.


## HTTP Request

`POST /langchain/bedrock/model/{modelId}/converse-stream`

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
Successful streaming response

#### 400
Bad request

#### 500
Internal server error


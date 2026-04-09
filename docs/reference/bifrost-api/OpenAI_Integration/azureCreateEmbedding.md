# Create embeddings (Azure OpenAI)

## HTTP Request

`POST /openai/openai/deployments/{deployment-id}/embeddings`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| deployment-id | path | string | Azure deployment ID |
| api-version | query | string |  |

### Request Body

```yaml
Object
  - `model` (string) - Model identifier
  - `input` (any) - Input text to embed
  - `encoding_format` (string)
  - `dimensions` (integer) - Number of dimensions for the embedding
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


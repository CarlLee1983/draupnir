# Create batch job (Anthropic format)

Creates a batch processing job using Anthropic format.
Use x-model-provider header to specify the provider.


## HTTP Request

`POST /anthropic/v1/messages/batches`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-model-provider | header | string | Provider to use (defaults to anthropic) |

### Request Body

```yaml
Object
  - `requests` (array) - Array of batch request items
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


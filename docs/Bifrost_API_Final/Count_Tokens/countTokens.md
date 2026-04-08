# Count tokens

Counts the number of tokens in the provided messages.


## HTTP Request

`POST /v1/responses/input_tokens`

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format
  - `messages` (array)
  - `fallbacks` (array)
  - `tools` (array)
  - `instructions` (string)
  - `text` (string)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error


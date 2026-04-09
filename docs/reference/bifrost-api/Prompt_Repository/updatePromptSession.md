# Update prompt session

Updates a session's messages, model params, etc.

## HTTP Request

`PUT /api/prompt-repo/sessions/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | integer | Session ID |

### Request Body

```yaml
Object
  - `name` (string)
  - `messages` (array)
  - `model_params` (object)
  - `provider` (string)
  - `model` (string)
```

### Responses

#### 200
Session updated

#### 400
Bad request

#### 500
Internal server error

